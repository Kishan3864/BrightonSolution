"use client";

import { useEffect, useState } from "react";
import { Button } from "./Button";
import { Field, TextArea } from "./Inputs";
import { useToast } from "./Toaster";

/**
 * Private note editor shared by the contact and lead details: a counted textarea with Save /
 * Discard, Ctrl+Enter to save, and it follows a note saved elsewhere (another device, a refresh)
 * while nothing is being typed here. `onSave` gets the trimmed text and resolves to success.
 */
export default function NoteEditor({
  value,
  onSave,
  maxLength,
  label = "Private note",
  hint = "Only visible here in the admin. Ctrl + Enter saves.",
  placeholder = "Call summary, quote sent, next step…",
  busy,
}: {
  value: string;
  onSave: (note: string) => Promise<boolean>;
  maxLength: number;
  label?: string;
  hint?: string;
  placeholder?: string;
  /** Another write on the same record is in flight. */
  busy?: boolean;
}) {
  const { toast } = useToast();
  const [note, setNote] = useState(value);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) setNote(value);
  }, [value, dirty]);

  const changed = note !== value;

  async function save() {
    if (saving || busy) return;
    const next = note.trim().slice(0, maxLength);
    setSaving(true);
    const ok = await onSave(next);
    setSaving(false);
    if (ok) {
      setNote(next);
      setDirty(false);
      toast({ tone: "success", title: next ? "Note saved" : "Note removed" });
    }
  }

  return (
    <div className="min-w-0">
      <Field label={label} hint={hint}>
        {(props) => (
          <TextArea
            {...props}
            value={note}
            rows={4}
            maxLength={maxLength}
            showCount
            placeholder={placeholder}
            onChange={(event) => {
              setNote(event.target.value);
              setDirty(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && changed) {
                event.preventDefault();
                void save();
              }
            }}
          />
        )}
      </Field>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button variant="primary" size="sm" icon="check" loading={saving} disabled={!changed || saving || busy} onClick={() => void save()}>
          Save note
        </Button>
        {changed ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={saving}
            onClick={() => {
              setNote(value);
              setDirty(false);
            }}
          >
            Discard
          </Button>
        ) : value ? (
          <span className="text-[0.75rem] text-muted">Saved</span>
        ) : null}
      </div>
    </div>
  );
}
