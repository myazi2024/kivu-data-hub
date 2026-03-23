import { useState } from "react";
import { Send, MessageSquare, FileText, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Message {
  id: string;
  sender: "user" | "admin";
  senderName: string;
  content: string;
  timestamp: Date;
  attachments?: string[];
}

interface PermitMessagingProps {
  contributionId: string;
  parcelNumber: string;
}

export function PermitMessaging({ contributionId, parcelNumber }: PermitMessagingProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "admin",
      senderName: "Service Urbanisme",
      content: "Votre demande d'autorisation a été reçue et est en cours d'examen.",
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      // TODO: Implémenter l'envoi de message via Supabase
      const message: Message = {
        id: Math.random().toString(36).substr(2, 9),
        sender: "user",
        senderName: "Vous",
        content: newMessage,
        timestamp: new Date(),
      };

      setMessages([...messages, message]);
      setNewMessage("");
      toast.success("Message envoyé avec succès");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erreur lors de l'envoi du message");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            Messagerie
          </span>
          <Badge variant="outline" className="text-xs">
            {messages.length} message(s)
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Zone de messages */}
        <ScrollArea className="h-[280px] rounded-lg border border-border/50 bg-muted/20 p-3">
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${
                  message.sender === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                    message.sender === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {message.sender === "user" ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </div>

                {/* Contenu du message */}
                <div
                  className={`flex-1 space-y-1 ${
                    message.sender === "user" ? "items-end" : "items-start"
                  } flex flex-col`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                      message.sender === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background border border-border"
                    }`}
                  >
                    <p className="text-sm font-medium mb-1">{message.senderName}</p>
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </div>
                  <time className="text-xs text-muted-foreground px-2">
                    {format(message.timestamp, "d MMM à HH:mm", { locale: fr })}
                  </time>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Zone de saisie */}
        <div className="space-y-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Posez une question ou demandez des précisions..."
            className="min-h-[80px] resize-none"
            disabled={sending}
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Réponse sous 24-48h ouvrables
            </p>
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              size="sm"
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Envoyer
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
