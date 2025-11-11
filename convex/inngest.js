import { query } from "./_generated/server";

export const getUsersWithOutstandingDebts = query({
    handler: async(ctx, args) => {
        const users = await ctx.db.query("users").collect();

        const expenses = await ctx.db.query("expenses").withIndex("by_group", (q) => q.eq("groupId", undefined))
        .collect();

        const settlements = await ctx.db.query("settlements").withIndex("by_group", (q) => q.eq("groupId", undefined))
        .collect();

        const userCache = new Map();
        const getUser = async (id) => {
            if (!userCache.has(id)) {
                userCache.set(id, await ctx.db.get(id));
            }

            return userCache.get(id);
        }

        const result = [];
        for (const user of users) {
            //  Map<counterpartyId, {amt, since}>
            // +amt: user owes
            // -amt: user is owed

            const ledger = new Map();

            for (const exp of expenses) {
                // user hasnt paid but is in splits
                const payer = exp.paidBy;
                if (payer !== user._id) {
                    const userSplit = exp.splits.find((s) => (s.userId === user._id) && !s.hasPaid);

                    if (!userSplit) continue;

                    const entry = ledger.get(exp.paidBy) ?? 
                    ({amount: 0, since: exp.date});

                    entry.amount += userSplit.amount;
                    entry.since = Math.min(entry.since, exp.date);

                    ledger.set(exp.paidBy, entry);
                }

                else {
                    for (const s of exp.splits) {
                        if (s.userId === payer || s.hasPaid) continue;

                        const entry = ledger.get(s.userId) ?? 
                        ({amount: 0, since: exp.date});

                        entry.amount -= s.amount;
                        entry.since = Math.min(entry.since, exp.date);
                        ledger.set(s.userId, entry);
                    }
                }   
            }

            // For Settlements
            for (const s of settlements) {
                if (s.paidBy === user._id) {
                    const entry = ledger.get(s.paidTo);
                    if (entry) {
                        entry.amount -= s.amount;
                        if (entry.amount === 0) ledger.delete(s.paidTo);
                        else ledger.set(s.paidTo, entry);
                    }  
                }

                else if (s.paidTo === user._id) {
                    const entry = ledger.get(s.paidBy);
                    if (entry) {
                        entry.amount += s.amount;
                        if (entry.amount === 0) ledger.delete(s.paidBy);
                        else ledger.set(s.paidBy, entry);
                }
            }
        }

        const debts = [];
        for (const [counterId, {amount, since}] of ledger) {
            if(amount > 0) {
                const counterUser = await getUser(counterId);
                debts.push({
                    userId: counterId,
                    name: counterUser.name,
                    amount,
                    since,
                });
            }
        }

        if (debts.length > 0) {
            result.push({
                id: user._id,
                name: user.name,
                email: user.email,
                debts,
            });
        }
    }

    return result;
}
});