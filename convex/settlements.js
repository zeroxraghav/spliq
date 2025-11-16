import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import {v} from "convex/values";

export const createSettlement = mutation({
    args: {
        amount: v.number(),
        note: v.optional(v.string()),
        paidBy: v.id("users"),
        paidTo: v.id("users"),
        groupId: v.optional(v.id("groups")),
        relatedExpenses: v.optional(v.array(v.id("expenses"))),
    },

    handler: async(ctx, args) => {
        const user = await ctx.runQuery(api.users.getCurrentUser);
        if (!user) {
            throw new Error("Unauthorized");
        }

        if (args.amount <= 0) throw new Error("Amount must be positive");
        if (args.paidBy === args.paidTo) {
        throw new Error("Payer and receiver cannot be the same user");
        }
        if (
        user._id !== args.paidBy &&
        user._id !== args.paidTo
        ) {
        throw new Error("You must be either the payer or the receiver");
        }

        if (args.groupId) {
            const grp = await ctx.db.get(args.groupId);
            if (!grp) {
                throw new Error("Group not found");
            }

            const isMember = grp.members.some((m) => m === user._id);
            if (!isMember) {
                throw new Error("You are not a member of this group");
            }
        }

         return await ctx.db.insert("settlements", {
            amount: args.amount,
            note: args.note,
            date: Date.now(), // server‑side timestamp
            paidBy: args.paidBy,
            paidTo: args.paidTo,
            groupId: args.groupId,
            relatedExpenseIds: args.relatedExpenseIds,
            createdBy: user._id,
        });
    }
})

export const getSettlementData = query({
    args:{
        entityType: v.string(),
        entityId: v.string()
    },

    handler: async(ctx, args) => {
        const user = await ctx.runQuery(api.users.getCurrentUser);

        if (args.entityType === "user") {
            const other = await ctx.db.get(args.entityId);
            if (!other) {
                throw new Error("User not found");
            }

            const myExpenses = await ctx.db.query("expenses")
            .withIndex("by_user_and_group", (q) => q.eq("paidBy", user._id).eq("groupId", undefined))
            .collect();

            const otherUserExpenses = await ctx.db.query("expenses")
            .withIndex("by_user_and_group", (q) => q.eq("paidBy", other._id).eq("groupId", undefined))
            .collect();

            const expenses = [...myExpenses, ...otherUserExpenses];

            let owes = 0;   // I owe them
            let owed = 0;   // they owe me

            for (const exp of expenses) {
                const meInvolved = exp.splits.some((s) => s.userId === user._id);
                const userInvolved = exp.splits.some((s) => s.userId === other._id);

                if (!meInvolved || !userInvolved) continue;

                if (exp.paidBy === user._id) {
                    const split = exp.splits.find((s) => (s.userId === other._id) && (!s.hasPaid));
                    
                    if (split) {
                        owed += split.amount;
                    }
                }

                else if (exp.paidBy === other._id) {
                    const split = exp.splits.find((s) => (s.userId === user._id) && (!s.hasPaid));
                    
                    if (split) {
                        owes += split.amount;
                    }
                }
            }
            
            const mySettlements = await ctx.db.query("settlements")
            .withIndex("by_user_and_group", (q) => q.eq("paidBy", user._id).eq("groupId", undefined))
            .collect();

            const otherUserSettlements = await ctx.db.query("settlements")
            .withIndex("by_user_and_group", (q) => q.eq("paidBy", other._id).eq("groupId", undefined))
            .collect();

            const settlements = [...mySettlements, ...otherUserSettlements];

            for (const st of settlements) {
                if (st.paidBy === user._id && st.paidTo === other._id) {
                    owes -= Math.max(0, st.amount);
                }

                else if (st.paidBy === other._id && st.paidTo === user._id) {
                    owed -= Math.max(0, st.amount);
                }
            }

            return {
                type: "user",
                counterpart : {
                    userId: other._id,
                    name: other.name,
                    email: other.email,
                    imageUrl: other.imageURL,
                },
                youAreOwed: owed,
                youOwe: owes,
                netBalance: owed-owes  // + => you should receive - => you should pay
            }
        }
        else if (args.entityType === "group") {
            const group = await ctx.db.get(args.entityId);
            if (!group) throw new Error("Group not found");

            const isMember = group.members.some((m) => m.userId === user._id);
            if (!isMember) throw new Error("You are not a member of this group");

            // ---------- expenses for this group
            const expenses = await ctx.db
                .query("expenses")
                .withIndex("by_group", (q) => q.eq("groupId", group._id))
                .collect();

            // ---------- initialise per‑member tallies
            const balances = {};
            group.members.forEach((m) => {
                if (m !== user._id) balances[m] = { owed: 0, owing: 0 };
            });

            // ---------- apply expenses
            for (const exp of expenses) {
                if (exp.paidBy === user._id) {
                // I paid; others may owe me
                exp.splits.forEach((split) => {
                    if (split.userId !== user._id && !split.hasPaid) {
                        balances[split.userId].owed += split.amount;
                    }
                });
                } else if (balances[exp.paidBy]) {
                // Someone else in the group paid; I may owe them
                const split = exp.splits.find((s) => s.userId === user._id && !s.hasPaid);
                if (split) balances[exp.paidBy].owing += split.amount;
                }
            }

            // ---------- apply settlements within the group
            const settlements = await ctx.db
                .query("settlements")
                .filter((q) => q.eq(q.field("groupId"), group._id))
                .collect();

            for (const st of settlements) {
                // we only care if ONE side is me
                if (st.paidBy === user._id && balances[st.paidTo]) {
                balances[st.paidTo].owing = Math.max(
                    0,
                    balances[st.paidTo].owing - st.amount
                );
                }
                if (st.paidTo === user._id && balances[st.paidBy]) {
                balances[st.paidBy].owed = Math.max(
                    0,
                    balances[st.paidBy].owed - st.amount
                );
                }
            }

            // ---------- shape result list
            const members = await Promise.all(
                Object.keys(balances).map((id) => ctx.db.get(id))
            );

            const list = Object.keys(balances).map((uid) => {
                const m = members.find((u) => u && u._id === uid);
                const { owed, owing } = balances[uid];
                return {
                userId: uid,
                name: m?.name || "Unknown",
                imageUrl: m?.imageURL,
                youAreOwed: owed,
                youOwe: owing,
                netBalance: owed - owing,
                };
            });

            return {
                type: "group",
                group: {
                id: group._id,
                name: group.name,
                description: group.description,
                },
                balances: list,
            };
        }
    throw new Error("Invalid entityType; expected 'user' or 'group'");
    }
})