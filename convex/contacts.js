import { mutation, query } from "./_generated/server";
import {api, internal} from "./_generated/api";
import {v} from "convex/values";

export const getAllContacts = query({
    handler: async(ctx) => {
        const user = await ctx.runQuery(api.users.getCurrentUser);

        const expensesYouPaid = await ctx.db.query("expenses").withIndex("by_user_and_group", (q) => q.eq("paidBy", user._id).eq("groupId", undefined)).collect();

        const expensesNotPaidByYou = (await ctx.db.query("expenses").withIndex("by_group", (q) => q.eq("groupId", undefined)).collect())
        .filter((expense) => expense.paidBy != user._id).filter((expense) => expense.splits.some((split) => split.userId === user._id))

        const personalExpenses = [...expensesNotPaidByYou, ...expensesYouPaid];

        const users = new Set();

        for (let i=0; i<personalExpenses.length; i++) {
            const exp = personalExpenses[i];

            if (exp.paidBy !== user._id) {
                users.add(exp.paidBy);
            }

            for (let j=0; j<exp.splits.length; j++) {
                const split = exp.splits[j];
                if (split.userId !== user._id) {
                    users.add(split.userId);
                }
            }
        }

        const contacts = await Promise.all([...users].map((id) => ctx.db.get(id)));

        const userGroups = (await ctx.db.query("groups").collect())
  .filter(group => group.members.includes(user._id));
        return {users: contacts, groups: userGroups};
    }
});

export const createGroup = mutation({
    args:{
        name: v.string(),
        description: v.string(),
        members: v.array(v.id("users"))
    },

    handler: async(ctx, args) => {
        const user = await ctx.runQuery(internal.users.getCurrentUser);

        if (!args.name) throw new Error("Group name cannot be empty");

        const uniqueMembers = new Set(args.members);
        uniqueMembers.add(user._id);

        for (const id of uniqueMembers) {
            if (!(await ctx.db.get(id))) throw new Error(`User with ID ${id} is invalid`);
        }

        return await ctx.db.insert("groups", {
            name: args.name,
            description: args.description,
            createdBy: user._id,
            members: Array.from(uniqueMembers),
        });
    }
})