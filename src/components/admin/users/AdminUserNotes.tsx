import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAdminNotes } from '@/hooks/useAdminNotes';
import { useAuth } from '@/hooks/useAuth';
import { useUserPermission } from '@/hooks/useUserPermissions';
import { StickyNote, Plus, Trash2, Edit, AlertCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AdminUserNotesProps {
  userId: string;
}

export const AdminUserNotes: React.FC<AdminUserNotesProps> = ({ userId }) => {
  const { notes, loading, fetchNotes, addNote, updateNote, deleteNote } = useAdminNotes(userId);
  const { profile } = useAuth();
  const canDelete = useUserPermission('notes', 'delete');
  const [open, setOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [isImportant, setIsImportant] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchNotes();
    }
  }, [userId, fetchNotes]);

  const handleSave = async () => {
    if (!noteContent.trim()) return;

    if (editingNote) {
      await updateNote(editingNote, noteContent, isImportant);
    } else {
      await addNote(noteContent, isImportant, profile?.full_name || undefined);
    }

    setNoteContent('');
    setIsImportant(false);
    setEditingNote(null);
    setOpen(false);
  };

  const handleEdit = (note: any) => {
    setEditingNote(note.id);
    setNoteContent(note.note_content);
    setIsImportant(note.is_important);
    setOpen(true);
  };

  const handleDelete = async (noteId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
      await deleteNote(noteId);
    }
  };

  return (
    <Card>
      <CardHeader className="p-2 md:p-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <StickyNote className="w-4 h-4" />
              Notes Privées ({notes.length})
            </CardTitle>
            <CardDescription className="text-[10px] md:text-xs">
              Notes administratives sur cet utilisateur
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1 h-7 text-xs">
                <Plus className="w-3 h-3" />
                Nouvelle note
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base">
                  {editingNote ? 'Modifier la note' : 'Nouvelle note'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Textarea
                  placeholder="Écrivez votre note ici..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="min-h-[100px] text-xs"
                />
                <div className="flex items-center space-x-1.5">
                  <Checkbox
                    id="important"
                    checked={isImportant}
                    onCheckedChange={(checked) => setIsImportant(checked as boolean)}
                  />
                  <label
                    htmlFor="important"
                    className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Marquer comme importante
                  </label>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOpen(false);
                      setNoteContent('');
                      setIsImportant(false);
                      setEditingNote(null);
                    }}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button onClick={handleSave} className="flex-1" disabled={!noteContent.trim()}>
                    {editingNote ? 'Mettre à jour' : 'Ajouter'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-2 md:p-3">
        {loading ? (
          <div className="text-center text-xs text-muted-foreground py-4">Chargement...</div>
        ) : notes.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-4">
            Aucune note pour cet utilisateur
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => (
              <div
                key={note.id}
                className={`p-1.5 rounded-lg border ${
                  note.is_important ? 'border-destructive bg-destructive/5' : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between gap-1.5 mb-1">
                  <div className="flex items-center gap-1 flex-1">
                    {note.is_important && <AlertCircle className="w-2.5 h-2.5 text-destructive shrink-0" />}
                    <Badge variant="secondary" className="text-[9px] py-0 px-1">
                      {note.admin_name || 'Admin'}
                    </Badge>
                    <span className="text-[9px] text-muted-foreground">
                      {format(new Date(note.created_at), 'dd MMM HH:mm', { locale: fr })}
                    </span>
                  </div>
                  <div className="flex gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0"
                      onClick={() => handleEdit(note)}
                    >
                      <Edit className="w-2.5 h-2.5" />
                    </Button>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:text-destructive"
                        onClick={() => handleDelete(note.id)}
                        title="Supprimer (permission notes.delete)"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-[10px] whitespace-pre-wrap">{note.note_content}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
