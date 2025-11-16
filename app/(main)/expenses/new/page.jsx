"use client"

import React from 'react'
import { Card, CardHeader, CardTitle, CardAction, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ExpenseForm from './_components/expense-form'
import { useRouter } from 'next/navigation'
const page = () => {
    const router = useRouter();
  return (
    <div className='container max-w-3xl mx-auto py-6'>
        <div className='mb-6'>
            <h1 className='text-5xl gradient-title font-bold'>New Expense</h1> 
            <p className='text-muted-foreground mt-1 text-xl'> Record a new expense to split with others </p>
        </div>

        <Card>
        <CardContent>
            <Tabs defaultValue="individual" className="pb-3">
            <TabsList className='grid grid-cols-2 w-full'>
                <TabsTrigger value="individual">Individual Expenses</TabsTrigger>
                <TabsTrigger value="group">Group Expenses</TabsTrigger>
            </TabsList>
            <TabsContent value="individual" className="mt-0">
              <ExpenseForm
                type="individual"
                onSuccess={(id) => router.push(`/person/${id}`)}
              />
            </TabsContent>
            <TabsContent value="group" className="mt-0">
              <ExpenseForm
                type="group"
                onSuccess={(id) => router.push(`/groups/${id}`)}
              />
            </TabsContent>
            </Tabs>
        </CardContent>
        </Card>
    </div>
  )
}

export default page