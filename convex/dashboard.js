import { query } from "./_generated/server";
import { api, internal } from "./_generated/api";

export const getUserBalances = query({
    handler: async(ctx) => {
        // 1-1 expenses
        const user = await ctx.runQuery(api.users.getCurrentUser);
        
        const expenses = (await ctx.db.query("expenses").collect()).filter((exp) => !exp.groupId && (exp.paidBy == user._id || exp.splits.some((split) => split.userId === user._id)))

        let youOwe = 0;
        let youAreOwed = 0;
        let balanceByUser = {};

        for (const exp of expenses) {
            const isUserPayer = exp.paidBy == user._id;
            const userSplit = exp.splits.find((s) => s.userId === user._id);

            if (isUserPayer) {
                for (const s of exp.splits) {
                    if (s.userId == user._id) continue;

                    youAreOwed += s.amount;
                    (balanceByUser[s.userId] ??= {owed:0, youOwe:0}).owed += s.amount;                    
                }
            }
            else if (userSplit && !userSplit.hasPaid) {
                youOwe += userSplit.amount;
                (balanceByUser[exp.paidBy] ??= {owed:0, youOwe:0}).youOwe += userSplit.amount;
            }
        }

        const settlements = (await ctx.db.query("settlements").collect()).filter((s) => !s.groupId && (s.paidBy == user._id || s.paidTo === user._id))

        for (const s of settlements) {
            if (s.paidBy == user._id) {
                youOwe -= s.amount;
                (balanceByUser[s.paidTo] ??= {owed:0, youOwe:0}).youOwe -= s.amount;
            }

            else {
                youAreOwed -= s.amount;
                (balanceByUser[s.paidBy] ??= {owed:0, youOwe:0}).owed -= s.amount;
            }
        }

        const youOweList = [];
        const youAreOwedList = [];

        for (const [user, bal] of Object.entries(balanceByUser)) {
            const net = bal.owed - bal.youOwe;
            if (net == 0) continue;
            
            const details = await ctx.db.get(user);
            const res = {
                id: user,
                name: details.name,
                imageURL: details.imageURL,
                amount: Math.abs(net)
            }
            if (net > 0) {
                // They owe you
                youAreOwedList.push(res);
            } 
            else if (net < 0) {
                // You owe them
                youOweList.push(res);
            }
        }

        return {
            youOwe,
            youAreOwed,
            totalBalance: youAreOwed - youOwe,
            oweDetails: {youOwe: youOweList, youAreOwed: youAreOwedList}
        }
    }
});

export const getTotalSpent = query({
  handler: async (ctx) => {
    const user = await ctx.runQuery(internal.users.getCurrentUser);

    // Get start of current year timestamp
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1).getTime();

    // Get all expenses for the current year
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_date", (q) => q.gte("date", startOfYear))
      .collect();

    // Filter for expenses where user is involved
    const userExpenses = expenses.filter(
      (expense) =>
        expense.paidByUserId === user._id ||
        expense.splits.some((split) => split.userId === user._id)
    );

    // Calculate total spent (personal share only)
    let totalSpent = 0;

    userExpenses.forEach((expense) => {
      const userSplit = expense.splits.find(
        (split) => split.userId === user._id
      );
      if (userSplit) {
        totalSpent += userSplit.amount;
      }
    });

    return totalSpent;
  },
});

// Get monthly spending
export const getMonthlySpending = query({
  handler: async (ctx) => {
    const user = await ctx.runQuery(internal.users.getCurrentUser);

    // Get current year
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1).getTime();

    // Get all expenses for current year
    const allExpenses = await ctx.db
      .query("expenses")
      .withIndex("by_date", (q) => q.gte("date", startOfYear))
      .collect();

    // Filter for expenses where user is involved
    const userExpenses = allExpenses.filter(
      (expense) =>
        expense.paidByUserId === user._id ||
        expense.splits.some((split) => split.userId === user._id)
    );

    // Group expenses by month
    const monthlyTotals = {};

    // Initialize all months with zero
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(currentYear, i, 1);
      monthlyTotals[monthDate.getTime()] = 0;
    }

    // Sum up expenses by month
    userExpenses.forEach((expense) => {
      const date = new Date(expense.date);
      const monthStart = new Date(
        date.getFullYear(),
        date.getMonth(),
        1
      ).getTime();

      // Get user's share of this expense
      const userSplit = expense.splits.find(
        (split) => split.userId === user._id
      );
      if (userSplit) {
        monthlyTotals[monthStart] =
          (monthlyTotals[monthStart] || 0) + userSplit.amount;
      }
    });

    // Convert to array format
    const result = Object.entries(monthlyTotals).map(([month, total]) => ({
      month: parseInt(month),
      total,
    }));

    // Sort by month (ascending)
    result.sort((a, b) => a.month - b.month);

    return result;
  },
});

export const getUserGroups = query({
    handler: async(ctx) => {
        const user = await ctx.runQuery(api.users.getCurrentUser);

        const userGroupsDet = await ctx.db.query("groups").collect();

        const userIdStr = String(user._id);
        const userGroups = userGroupsDet.filter((g) =>
          Array.isArray(g.members) && g.members.some((m) => {
            if (m == null) return false;
            // member can be an Id object, a plain string, or an object with userId/_id
            if (typeof m === "object") {
              if ("userId" in m) return String(m.userId) === userIdStr;
              if ("_id" in m) return String(m._id) === userIdStr;
            }
            return String(m) === userIdStr;
          })
        );

        const groupsWithDetails = [];

        for (const group of userGroups) {

            const expenses = await ctx.db
            .query("expenses")
            .withIndex("by_group", (q) => q.eq("groupId", group._id))
            .collect();

            let balance = 0;

            expenses.forEach((expense) => {
            if (expense.paidBy === user._id) {
                // User paid for others
                expense.splits.forEach((split) => {
                if (split.userId !== user._id && !split.hasPaid) {
                    balance += split.amount;
                }
            });
            } else {
                // User owes someone else
                const userSplit = expense.splits.find(
                (split) => split.userId === user._id
                );
                if (userSplit && !userSplit.hasPaid) {
                balance -= userSplit.amount;
                }
            }
        });

        // Apply settlements
        const settlements = await ctx.db
        .query("settlements")
        .withIndex("by_group", (q) => q.eq("groupId", group._id))
        .filter(
            (s) => s.paidBy === user._id || s.paidTo === user._id
        )
        .collect();

        settlements.forEach((settlement) => {
          if (settlement.paidBy === user._id) {
            // User paid someone
            balance += settlement.amount;
          } else {
            // Someone paid the user
            balance -= settlement.amount;
          }
        });

        groupsWithDetails.push({
        ...group,
        id: group._id,
        balance,
        });
        }

        return groupsWithDetails;
    }
});