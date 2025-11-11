"use client"

import React, { useState } from 'react'
import { useConvexQuery, useConvexMutation } from '@/hooks/use-convex-query'
import { api } from '@/convex/_generated/api'
import { BarLoader } from 'react-spinners'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { BalanceSummary } from './_components/balance-summary'
import { GroupList } from './_components/group-list'
import { ExpenseSummary } from './_components/expense-summary'
import { ChevronRight, Users } from 'lucide-react'
import { PlusCircle } from 'lucide-react'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const page = () => {
  const {data: balances, isLoading: balancesLoading} = useConvexQuery(api.dashboard.getUserBalances);
  const {data: groupsWithDetails, isLoading: groupBalanceLoading} = useConvexQuery(api.dashboard.getUserGroups);
  const {data: totalSpentBalance, isLoading: totalSpentLoading} = useConvexQuery(api.dashboard.getTotalSpent);
  const {data: monthlySpent, isLoading: monthlySpentLoading} = useConvexQuery(api.dashboard.getMonthlySpending);

  const isLoading = balancesLoading || groupBalanceLoading || totalSpentLoading || monthlySpentLoading;
  return (
    <div>
      {isLoading ? (
        <div className="container mx-auto py-12">
          <BarLoader width={"100%"} color="#36d7b7" />
        </div>
      ) :(
      <>
        <div className="flex justify-between flex-col sm:flex-row sm:items-center gap-4 mb-3">
            <h1 className="text-5xl gradient-title">Dashboard</h1>
            <Button asChild>
              <Link href="/expenses/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add expense
              </Link>
            </Button>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>Total Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='font-bold text-2xl'>
                {balances.totalBalance >= 0 ? (
                  <span className='text-green-600'> +{'\u20B9' + balances.totalBalance.toFixed(2)}</span>
                ) : (
                  <span className='text-red-600'> {'\u20B9' + balances.totalBalance.toFixed(2)}</span>
                )}
              </div>
              <p>
                {balances.totalBalance > 0 ? 'You are owed this amount' : balances.totalBalance<0 ? 'You owe this amount' : 'Settled Up!'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>You are owed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='font-bold text-2xl'>
                {balances.youAreOwed >= 0 ? (
                  <span className='text-green-600'> +{'\u20B9' + balances.youAreOwed.toFixed(2)}</span>
                ) : (
                  <span className='text-red-600'> {'\u20B9' + balances.youAreOwed.toFixed(2)}</span>
                )}
              </div>
              <p>
                From {balances.oweDetails.youAreOwed.length} {balances.oweDetails.youAreOwed.length === 1 ? 'person' : 'people'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>You owe</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='font-bold text-2xl'>
                {balances.youOwe >= 0 ? (
                  <span className='text-green-600'> +{'\u20B9' + balances.youOwe.toFixed(2)}</span>
                ) : (
                  <span className='text-red-600'> {'\u20B9' + balances.youOwe.toFixed(2)}</span>
                )}
              </div>
              <p>
                From {balances.oweDetails.youOwe.length} {balances.oweDetails.youOwe.length === 1 ? 'person' : 'people'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Expense summary */}
              <ExpenseSummary
                monthlySpending={monthlySpent}
                totalSpent={totalSpentBalance}
              />
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* Balance details */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle>Balance Details</CardTitle>
                    <Button variant="link" asChild className="p-0">
                      <Link href="/contacts">
                        View all
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <BalanceSummary balances={balances} />
                </CardContent>
              </Card>

              {/* Groups */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle>Your Groups</CardTitle>
                    <Button variant="link" asChild className="p-0">
                      <Link href="/contacts">
                        View all
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <GroupList groups={groupsWithDetails} />
                </CardContent>
                <CardFooter>
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/contacts?createGroup=true">
                      <Users className="mr-2 h-4 w-4" />
                      Create new group
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
      </>
    )}
    </div>
  )
}

export default page