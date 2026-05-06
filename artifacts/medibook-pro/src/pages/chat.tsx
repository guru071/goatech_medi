import { useState, useEffect, useRef } from "react";
import { Send, MessageSquare, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Layout from "@/components/Layout";
import { useListChatRooms, useListMessages, useSendMessage, getListMessagesQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import io, { Socket } from "socket.io-client";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: rooms } = useListChatRooms(
    { params: { userId: user?.id as any } },
    { query: { enabled: !!user } }
  );
  const { data: messages } = useListMessages(
    selectedRoom?.id,
    { params: { limit: 100 } },
    { query: { enabled: !!selectedRoom } }
  );
  const sendMutation = useSendMessage();

  const roomsList = (rooms as any[]) ?? [];
  const messagesList = (messages as any[]) ?? [];

  useEffect(() => {
    const socket = io({ path: "/api/socket.io", transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("new_message", (msg: any) => {
      queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(selectedRoom?.id) });
    });
    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => {
    if (selectedRoom && socketRef.current) {
      socketRef.current.emit("join_room", String(selectedRoom.id));
    }
  }, [selectedRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesList.length]);

  const handleSend = async () => {
    if (!message.trim() || !selectedRoom || !user) return;
    const content = message.trim();
    setMessage("");
    try {
      const msg = await sendMutation.mutateAsync({
        roomId: selectedRoom.id,
        data: { senderId: user.id as any, senderRole: user.role || "patient", content }
      }) as any;
      socketRef.current?.emit("send_message", { roomId: selectedRoom.id, message: msg });
      queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(selectedRoom.id) });
    } catch {}
  };

  if (!user) return (
    <Layout>
      <div className="container mx-auto px-4 py-20 text-center">
        <MessageSquare size={40} className="text-muted-foreground mx-auto mb-3" />
        <h2 className="text-2xl font-bold">Sign in to access messages</h2>
        <Link href="/login"><Button className="mt-4">Sign In</Button></Link>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="bg-card border rounded-2xl overflow-hidden flex h-[calc(100vh-12rem)] max-h-[700px]">
          {/* Room list */}
          <div className="w-72 border-r flex flex-col flex-shrink-0">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Messages</h2>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Circle size={8} className={cn("fill-current", connected ? "text-green-500" : "text-gray-400")} />
                  {connected ? "Online" : "Offline"}
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {roomsList.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm mt-8">
                  <MessageSquare size={24} className="mx-auto mb-2 opacity-50" />
                  No conversations yet
                </div>
              ) : (
                roomsList.map((room: any) => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className={cn(
                      "w-full text-left p-4 border-b hover:bg-muted/50 transition-colors",
                      selectedRoom?.id === room.id && "bg-primary/5 border-l-2 border-l-primary"
                    )}
                  >
                    <p className="font-medium text-sm truncate">{room.clinicName || room.userName}</p>
                    {room.lastMessage && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{room.lastMessage}</p>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat area */}
          {selectedRoom ? (
            <div className="flex-1 flex flex-col">
              <div className="p-4 border-b flex items-center gap-3">
                <Avatar className="w-9 h-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {(selectedRoom.clinicName || selectedRoom.userName || "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{selectedRoom.clinicName || selectedRoom.userName}</p>
                  <p className="text-xs text-muted-foreground">Chat room #{selectedRoom.id}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messagesList.map((msg: any) => {
                  const isMe = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={cn("flex gap-2", isMe && "flex-row-reverse")}>
                      <Avatar className="w-7 h-7 flex-shrink-0 mt-1">
                        <AvatarFallback className="text-xs bg-muted">{(msg.senderName || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "max-w-[70%] rounded-2xl px-3 py-2 text-sm",
                        isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"
                      )}>
                        {!isMe && <p className="text-xs font-medium mb-0.5 opacity-70">{msg.senderName}</p>}
                        <p>{msg.content}</p>
                        <p className={cn("text-xs mt-0.5", isMe ? "text-primary-foreground/60" : "text-muted-foreground")}>
                          {new Date(msg.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 border-t flex gap-2">
                <Input
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button onClick={handleSend} disabled={!message.trim() || sendMutation.isPending} size="icon">
                  <Send size={16} />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare size={40} className="mx-auto mb-3 opacity-40" />
                <p>Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
