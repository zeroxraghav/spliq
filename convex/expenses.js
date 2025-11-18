import { query } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { mutation } from "./_generated/server";

export const getExpenseBetweenUsers = query({
    args: {
        userId: v.id("users"),
    },

    handler: async (ctx, args) => {
        const thisUser = await ctx.runQuery(internal.users.getCurrentUser);
        if (thisUser._id === args.userId) {
            throw new Error("Cannot get expenses between the same user");
        }

        // I Paid
        const IPaid = await ctx.db.query("expenses")
        .withIndex("by_user_and_group", (q) => q.eq("paidBy", thisUser._id).eq("groupId", undefined))
        .collect();

        const HePaid = await ctx.db.query("expenses")
        .withIndex("by_user_and_group", (q) => q.eq("paidBy", args.userId).eq("groupId", undefined))
        .collect();

        const expenses = [...IPaid, ...HePaid];
        const filteredExpenses = expenses.filter((e) => {
            const meInSplits = e.splits.some((s) => s.userId === thisUser._id);
            const HeInSplits = e.splits.some((s) => s.userId === args.userId);

            const meInvolved = e.paidBy === thisUser._id || meInSplits;
            const HeInvolved = e.paidBy === args.userId || HeInSplits;

            return meInvolved && HeInvolved;
        })

        const settlements = await ctx.db
        .query("settlements")
        .filter((q) =>
            q.and(
            q.eq(q.field("groupId"), undefined),
            q.or(
                q.and(
                q.eq(q.field("paidBy"), thisUser._id),
                q.eq(q.field("paidTo"), args.userId)
                ),
                q.and(
                q.eq(q.field("paidBy"), args.userId),
                q.eq(q.field("paidTo"), thisUser._id)
                )
            )
            )
        )
        .collect();

        let balance = 0;

        for (const e of filteredExpenses) {
            if (e.paidBy === thisUser._id) {
                const split = e.splits.find((s) => s.userId === args.userId && !s.hasPaid);
                if (split) balance += split.amount; // they owe me
            } else {
                const split = e.splits.find((s) => s.userId === thisUser._id && !s.hasPaid);
                if (split) balance -= split.amount; // I owe them
            }
        }

        for (const s of settlements) {
            if (s.paidBy === thisUser._id)
                balance += s.amount; // I paid them back
            else balance -= s.amount; // they paid me back
        }

        const otherUser = await ctx.db.get(args.userId);
        if (!otherUser) throw new Error("User not found");
        
        console.log("--- EXECUTING v2 OF getExpenseBetweenUsers ---", otherUser.name);
        return {
            filteredExpenses,
            settlements,
            otherUser: {
                id: otherUser._id,
                name: otherUser.name,
                email: otherUser.email,
                imageUrl: otherUser.imageURL ?? null,
            },
            balance,
        };

    }
});

export const deleteExpense = mutation({
  args: {
    expenseId: v.id("expenses"),
  },
  handler: async (ctx, args) => {
    // Get the current user
    const user = await ctx.runQuery(internal.users.getCurrentUser);

    // Get the expense
    const expense = await ctx.db.get(args.expenseId);
    if (!expense) {
      throw new Error("Expense not found");
    }

    // Check if user is authorized to delete this expense
    // Only the creator of the expense or the payer can delete it
    if (expense.createdBy !== user._id && expense.paidBy !== user._id) {
      throw new Error("You don't have permission to delete this expense");
    }

    // Delete any settlements that specifically reference this expense
    // Since we can't use array.includes directly in the filter, we'll
    // fetch all settlements and then filter in memory
    // const allSettlements = await ctx.db.query("settlements").collect();

    // const relatedSettlements = allSettlements.filter(
    //   (settlement) =>
    //     settlement.relatedExpenses !== undefined &&
    //     settlement.relatedExpenses.includes(args.expenseId)
    // );

    // for (const settlement of relatedSettlements) {
    //   // Remove this expense ID from the relatedExpenseIds array
    //   const updatedRelatedExpenseIds = settlement.relatedExpenses.filter(
    //     (id) => id !== args.expenseId
    //   );

    //   if (updatedRelatedExpenseIds.length === 0) {
    //     // If this was the only related expense, delete the settlement
    //     await ctx.db.delete(settlement._id);
    //   } else {
    //     // Otherwise update the settlement to remove this expense ID
    //     await ctx.db.patch(settlement._id, {
    //       relatedExpenses: updatedRelatedExpenseIds,
    //     });
    //   }
    // }

    // Delete the expense
    await ctx.db.delete(args.expenseId);

    return { success: true };
  },
});

export const createExpense = mutation({
    args: {
        description: v.string(),
        amount: v.number(),
        category: v.optional(v.string()),
        date: v.number(),
        paidBy: v.id("users"),
        splitType: v.string(), 
        splits: v.array(
            v.object({
                userId: v.id("users"),
                amount: v.number(),  
                hasPaid: v.boolean(),
            })
        ),
        groupId: v.optional(v.id("groups")),
    },

    handler: async(ctx, args) => {
        const user = await ctx.runQuery(internal.users.getCurrentUser);

        if (args.groupId) {
            const group = await ctx.db.get(args.groupId);
            if (!group) {
                throw new Error("Group not found");
            }
            
            console.log("GROUP DATA:", group);
            const isMember = group.members.some((m) => m === user._id);
            if (!isMember) {
                throw new Error("You are not a member of this group");
            }
        }

        const totalSplitAmount = args.splits.reduce(
        (sum, split) => sum + split.amount,0);
        const tolerance = 0.01; // Allow for small rounding errors
        if (Math.abs(totalSplitAmount - args.amount) > tolerance) {
        throw new Error("Split amounts must add up to the total expense amount");
        }

        const expId = await ctx.db.insert("expenses", {
            description: args.description,
            amount: args.amount,
            category: args.category || "Other",
            date: args.date,
            paidBy: args.paidBy,
            splitType: args.splitType, 
            splits: args.splits,
            groupId: args.groupId,
            createdBy: user._id,
        });

        console.log("Expense donee")

        return expId;
    }
});