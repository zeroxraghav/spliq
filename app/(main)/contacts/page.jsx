"use client"

import { api } from '@/convex/_generated/api'
import { useConvexQuery } from '@/hooks/use-convex-query'
import React from 'react'
import { Button } from '@/components/ui/button'
import { BarLoader } from 'react-spinners'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User, Users } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import GroupModal from './_components/create-modal'
import { useQuery } from 'convex/react'
import { useSearchParams } from 'next/navigation'

const page = () => {
  const data = useQuery(api.contacts.getAllContacts);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  
  console.log(data);
  const router = useRouter();

  const { users, groups } = data || { users: [], groups: [] };

  const searchParam = useSearchParams();
  useEffect(() => {
    const groupCreated = searchParam.get("createGroup");
    if (groupCreated === "true") {
      setIsCreateGroupModalOpen(true);

      const url = new URL(window.location.href);
      url.searchParams.delete("createGroup");

      router.replace(url.pathname + url.search);
    }
  }, [searchParam, router])

  if (data === undefined) {
    return (
      <div className="container mx-auto py-12">
        <BarLoader width={"100%"} color="#36d7b7" />
      </div>
    );
  }

  return (  
    <div className="container mx-auto py-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between mb-6">
        <h1 className="text-5xl gradient-title">Contacts</h1>
        <Button onClick={() => setIsCreateGroupModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Group
        </Button>
      </div>


       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Individual Contacts */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <User className="mr-2 h-5 w-5" />
            People
          </h2>
          {users.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                No contacts yet. Add an expense with someone to see them here.
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {users.map((user) => (
                <Link key={user._id} href={`/person/${user._id}`}>
                  <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.imageURL} />
                            <AvatarFallback>
                              {user.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

        </div>

        {/* Groups */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Groups
          </h2>
          {groups.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                No groups yet. Create a group to start tracking shared expenses.
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {groups.map((group) => (
                <Link key={group._id} href={`/groups/${group._id}`}>
                  <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 p-2 rounded-md">
                            <Users className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{group.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {group.members.length} members
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <GroupModal
        isOpen={isCreateGroupModalOpen}
        onClose={() => setIsCreateGroupModalOpen(false)}
        onSuccess={(groupId) => {
          router.push(`/groups/${groupId}`);
        }}
      />
    </div>
  )
}

export default page