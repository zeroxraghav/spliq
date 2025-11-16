import { useConvexMutation, useConvexQuery } from "@/hooks/use-convex-query";
import { getAllCategories } from "@/lib/expense-categories";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { api } from "@/convex/_generated/api";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import SplitSelector from "./split-selector";
import { Tabs, TabsContent, TabsTrigger, TabsList } from "@/components/ui/tabs";

import CategorySelector from "./category-selector";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parse } from "date-fns";
import GroupSelector from "./group-selector";
import ParticipantSelector from "./participant-selector";
import { toast } from "sonner";
const ExpenseForm = ({ type, onSuccess }) => {
  const [participants, setParticipants] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [splits, setSplits] = useState([]);

  const expenseSchema = z.object({
    description: z.string().min(1, "Description is required"),
    amount: z
      .string()
      .min(1, "Amount is required")
      .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Amount must be a positive number",
      }),
    category: z.optional(z.string()),
    date: z.date(),
    paidBy: z.string().min(1, "Payer is required"),
    splitType: z.enum(["equal", "percentage", "exact"]),
    groupId: z.optional(z.string()),
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: "",
      amount: "",
      category: "",
      date: new Date(),
      paidBy: "",
      splitType: "equal",
      groupId: type === "group" ? "" : undefined,
    },
  });

  const amountValue = watch("amount");
  const paidBy = watch("paidBy");

  const { data: user } = useConvexQuery(api.users.getCurrentUser);
  const createExpense = useConvexMutation(api.expenses.createExpense);
  const categories = getAllCategories();

  useEffect(() => {
    if (participants.length === 0 && user) {
      // Always add the current user as a participant
      setParticipants([
        {
          id: user._id,
          name: user.name,
          email: user.email,
          imageUrl: user.imageURL,
        },
      ]);
    }
  }, [user, participants]);

  const onSubmit = async (data) => {
    try {
      const amount = parseFloat(data.amount);
      const formattedSplits = splits.map((s) => ({
        userId: s.userId,
        amount: s.amount,
        hasPaid: s.userId === data.paidBy,
      }));

      const totalSplitAmount = formattedSplits.reduce(
        (sum, split) => sum + split.amount,
        0
      );
      const tolerance = 0.01;

      if (Math.abs(totalSplitAmount - amount) > tolerance) {
        toast.error(
          `Split amounts don't add up to the total. Please adjust your splits.`
        );
        return;
      }

      const groupId =
        type === "individual" || !data.groupId ? undefined : data.groupId;

      // await createExpense.mutationFunction({
      //   description: data.description,
      //   amount: amount,
      //   category: data.category || "Other",
      //   date: data.date.getTime(),
      //   paidBy: data.paidBy,
      //   splitType: data.splitType,
      //   splits: formattedSplits,
      //   groupId,
      // });

      // toast.success("Expense created successfully!");
      // reset();

      const otherParticipant = participants.find((p) => p.id !== user._id);
      const otherUserId = otherParticipant?.id;

      console.log("After Submission", groupId);
      if (onSuccess) onSuccess(type === "individual" ? otherUserId : groupId);
    } catch (error) {
      toast.error(`Failed to create expense: ${error.message}`);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Lunch Movie Tickets..."
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-red-600">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              placeholder="0.00"
              type="number"
              step="0.01"
              min="0.01"
              {...register("amount")}
            />
            {errors.amount && (
              <p className="text-sm text-red-500">{errors.amount.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>

            <CategorySelector
              categories={categories || []}
              onChange={(categoryId) => {
                if (categoryId) {
                  setValue("category", categoryId);
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    format(selectedDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setValue("date", date);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {type === "group" && (
          <div className="space-y-2">
            <Label>Group</Label>
            <GroupSelector
              onChange={(group) => {
                // Only update if the group has changed to prevent loops
                if (!selectedGroup || selectedGroup.id !== group.id) {
                  setSelectedGroup(group);
                  setValue("groupId", group.id);

                  // Update participants with the group members
                  if (group.members && Array.isArray(group.members)) {
                    // Set the participants once, don't re-set if they're the same
                    setParticipants(group.members);
                  }
                }
              }}
            />
            {!selectedGroup && (
              <p className="text-xs text-amber-600">
                Please select a group to continue
              </p>
            )}
          </div>
        )}

        {type === "individual" && (
          <div className="space-y-2">
            <Label>Participants</Label>
            <ParticipantSelector
              participants={participants}
              onParticipantsChange={setParticipants}
            />
            {participants.length <= 1 && (
              <p className="text-xs text-amber-600">
                Please add at least one other participant
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label>Paid by</Label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            {...register("paidBy")}
          >
            <option value="">Select who paid</option>
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.id === user._id ? "You" : participant.name}
              </option>
            ))}
          </select>
          {errors.paidBy && (
            <p className="text-sm text-red-500">{errors.paidBy.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Split type</Label>
          <Tabs
            defaultValue="equal"
            onValueChange={(value) => setValue("splitType", value)}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="equal">Equal</TabsTrigger>
              <TabsTrigger value="percentage">Percentage</TabsTrigger>
              <TabsTrigger value="exact">Exact Amounts</TabsTrigger>
            </TabsList>
            <TabsContent value="equal" className="pt-4">
              <p className="text-sm text-muted-foreground">
                Split equally among all participants
              </p>
              <SplitSelector
                type="equal"
                amount={parseFloat(amountValue) || 0}
                participants={participants}
                paidBy={paidBy}
                onSplitsChange={setSplits} // Use setSplits directly
              />
            </TabsContent>
            <TabsContent value="percentage" className="pt-4">
              <p className="text-sm text-muted-foreground">
                Split by percentage
              </p>
              <SplitSelector
                type="percentage"
                amount={parseFloat(amountValue) || 0}
                participants={participants}
                paidByUserId={paidBy}
                onSplitsChange={setSplits} // Use setSplits directly
              />
            </TabsContent>
            <TabsContent value="exact" className="pt-4">
              <p className="text-sm text-muted-foreground">
                Enter exact amounts
              </p>
              <SplitSelector
                type="exact"
                amount={parseFloat(amountValue) || 0}
                participants={participants}
                paidByUserId={paidBy}
                onSplitsChange={setSplits} // Use setSplits directly
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isSubmitting || participants.length <= 1}
        >
          {isSubmitting ? "Creating..." : "Create Expense"}
        </Button>
      </div>
    </form>
  );
};

export default ExpenseForm;
