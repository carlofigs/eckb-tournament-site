import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/auth'
import { useTournamentStore, exportTournamentState } from '@/store/tournament'
import { Button } from '@/components/ui/button'
import { AccountState } from '@/components/AccountState'
import { ConfirmDialog } from '@/components/ConfirmDialog'

export function Account() {
  const role = useAuthStore((s) => s.role)

  return (
    <section>
      <h2 className="text-xl font-extrabold mb-3">Account</h2>
      <AccountState />
      {role === 'organiser' && <AdminTools />}
    </section>
  )
}

/**
 * Organiser-only admin tools. Export/import bundle scores + ref
 * assignments together — useful as a manual backup or for moving
 * data between Supabase projects. Auth state is NOT exported (lives
 * in a separate localStorage key).
 *
 * Day-to-day cross-device sync goes through Supabase realtime; these
 * tools are for backup, recovery, and bootstrapping a new tournament.
 */
function AdminTools() {
  const importState = useTournamentStore((s) => s.importState)
  const resetAll = useTournamentStore((s) => s.resetAll)
  const fileRef = useRef<HTMLInputElement>(null)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)

  const handleExport = () => {
    const data = exportTournamentState()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `eckb-tournament-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleImportClick = () => fileRef.current?.click()

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const obj = JSON.parse(String(ev.target?.result ?? ''))
        const incoming = obj.state ?? obj
        if (!incoming.games) throw new Error('Missing games key')
        importState({ games: incoming.games, gameRefs: incoming.gameRefs ?? {} })
        toast.success('Imported.')
      } catch (err) {
        toast.error(
          'Import failed: ' + (err instanceof Error ? err.message : String(err)),
        )
      } finally {
        if (fileRef.current) fileRef.current.value = ''
      }
    }
    reader.readAsText(f)
  }

  // Reset confirmation runs through the shared ConfirmDialog so the
  // UX matches the rest of the app (focus trap, dismiss-on-backdrop,
  // proper destructive styling). The actual destructive call is
  // wired from the dialog's onConfirm.

  return (
    <div className="bg-card border rounded-lg p-4">
      <h3 className="font-extrabold text-base mb-1">Organiser tools</h3>
      <p className="text-sm text-muted-foreground mb-3">
        Day-to-day sync between phones happens automatically via Supabase
        realtime. These tools are for backups and one-off transfers — export
        the JSON to keep a copy, or import to seed a new device or recover
        from a wipe.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleExport}>Export JSON</Button>
        <Button variant="outline" onClick={handleImportClick}>
          Import JSON
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={handleImportFile}
        />
        <Button variant="destructive" onClick={() => setResetConfirmOpen(true)}>
          Reset all
        </Button>
      </div>

      <ConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title="Reset all scores and assignments?"
        description="The ref roster is preserved. Scores and assignments are wiped on every device. This cannot be undone."
        confirmLabel="Reset"
        destructive
        onConfirm={resetAll}
      />
    </div>
  )
}
