import { query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import {v} from "convex/values"

export const getGroupExpenses = query({
    args: {groupId: v.id("groups")},
    handler: async(ctx, args) => {
        const thisUser = await ctx.runQuery(internal.users.getCurrentUser);

        const grp = await ctx.db.get(args.groupId);
        if (!grp) throw new Error("Group not found");

        if (!grp.members.some((m) => m === thisUser._id)) throw new Error("You are not a member of this group");

        const expenses = await ctx.db.query("expenses")
        .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
        .collect();

        const settlements = await ctx.db.query("settlements")
        .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
        .collect();

        const memberDetails = await Promise.all(
            grp.members.map(async (id) => {
                const u = await ctx.db.get(id);
                return u;
            })
        );

        const ids = memberDetails.map((m) => m._id);

        const totals = Object.fromEntries(ids.map((id) => [id, 0]));

        const ledger = {};
        ids.forEach((a) => {
            ledger[a] = {};
            ids.forEach((b) => {
                if (a !== b) ledger[a][b] = 0;
            });
        });

        for (const exp of expenses) {
            const payer = exp.paidBy;

            for (const s of exp.splits) {
                if (s.userId === payer) continue;

                const debtor = s.userId;
                const amt = s.amount;

                totals[payer] += amt;
                totals[debtor] -= amt;

                ledger[debtor][payer] += amt;
            }
        }

        for (const s of settlements) {
            totals[s.paidBy] += s.amount;
            totals[s.paidTo] -= s.amount;

            ledger[s.paidBy][s.paidTo] -= s.amount; // they paid back
        }

        ids.forEach((a) => {
            ids.forEach((b) => {
                if (a>=b) return;

                const diff = ledger[a][b] - ledger[b][a];
                if (diff > 0) {
                    // a owes b
                    ledger[a][b] = diff;
                    ledger[b][a] = 0;
                }
                
                else if (diff < 0) {
                    ledger[a][b] = 0;
                    ledger[b][a] = -diff;
                }

                else {
                    ledger[a][b] = ledger[b][a] = 0;
                }
            })
        })

        const balances = memberDetails.filter(Boolean).map((m) => ({
            ...m,
            totalBalance: totals[m._id],
            owes: Object.entries(ledger[m._id])
                .filter(([, v]) => v > 0)
                .map(([to, amount]) => ({ to, amount })),
            owedBy: ids
                .filter((other) => ledger[other][m._id] > 0)
                .map((other) => ({ from: other, amount: ledger[other][m._id] })),
        }));
        

        const userLookupMap = {};
        memberDetails.forEach((member) => {
        userLookupMap[member._id] = member;
        });

        return {
        grp,
        memberDetails,
        expenses,
        settlements,
        balances,
        userLookupMap,
        };
    }
});

export const getGroupOrMembers = query({
    args: {
        groupId: v.optional(v.id("groups")),
    },

    handler: async (ctx, args) => {
        const user = await ctx.runQuery(api.users.getCurrentUser);
        
        const allGroups = await ctx.db.query("groups").collect();
         const userGroups = allGroups.filter(
      (g) => Array.isArray(g.members) && g.members.includes(user._id)
    );
        if (args.groupId) {
            const group = userGroups.find((g) => g._id === args.groupId);
            if (!group) {
                throw new Error("Group not found or you are not a member");
            }
            

            console.log("Members:", group.members);
            const memberDetails = await Promise.all(
                group.members.map(async (m) => {
                    console.log("Fetching member:", m);
                    const mem = await ctx.db.get(m);
                    if (!mem) return null;
                    return {
                        id: mem._id,
                        name: mem.name,
                        email: mem.email,
                        imageUrl: mem.imageURL,
                    }
                })
            );

            const validMembers = memberDetails.filter((m) => m !== null);

            return {
                selectedGroup : {
                    id:  group._id,
                    name: group.name,
                    description: group.description,
                    createdBy: group.createdBy,
                    members: validMembers,
                },
                groups: userGroups.map((g) => {
                    return {
                        id: g._id,
                        name: g.name,
                        description: g.description,
                        memberCount: g.members.length,
                    }
                })
            }
        }
        else {
            return {
                selectedGroup: null,
                groups: userGroups.map((g) => {
                    return {
                        id: g._id,
                        name: g.name,
                        description: g.description,
                        memberCount: g.members.length,
                    }
                })
            }
        }

    }   
})