import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/store/auth'
import { useTournamentStore } from '@/store/tournament'

interface SignInDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Step = 'pin' | 'ref-name'

/**
 * Sign-in flow:
 *
 *   Organiser PIN          → sign in directly
 *   A head ref's own PIN   → sign in directly as that ref
 *   Universal line-ref PIN → step 2: pick name from non-head refs
 *   Wrong / empty          → error
 *
 * Auth state is stored per-device by `useAuthStore` so refs only sign
 * in once on each phone they bring to the fields.
 */
export function SignInDialog({ open, onOpenChange }: SignInDialogProps) {
  const checkPin = useAuthStore((s) => s.checkPin)
  const signInOrganiser = useAuthStore((s) => s.signInOrganiser)
  const signInRef = useAuthStore((s) => s.signInRef)
  const refsMap = useTournamentStore((s) => s.refs)

  // Step 2's roster picker is filtered to non-head refs — head refs
  // identify themselves via their personal PIN, not the picker.
  const lineRefs = useMemo(
    () =>
      Object.values(refsMap)
        .filter((r) => !r.headEligible)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [refsMap],
  )

  const [step, setStep] = useState<Step>('pin')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [chosenRef, setChosenRef] = useState<string>(lineRefs[0]?.id ?? '')

  useEffect(() => {
    if (open) {
      setStep('pin')
      setPin('')
      setError(null)
      setChosenRef(lineRefs[0]?.id ?? '')
    }
  }, [open, lineRefs])

  const handleConfirm = () => {
    if (step === 'pin') {
      const match = checkPin(pin)
      switch (match.kind) {
        case 'organiser':
          signInOrganiser()
          onOpenChange(false)
          return
        case 'head-ref':
          signInRef(match.refId)
          onOpenChange(false)
          return
        case 'line-ref':
          setStep('ref-name')
          setError(null)
          return
        case 'invalid':
          setError('Wrong PIN.')
          return
      }
    }
    // step === 'ref-name'
    if (!chosenRef) return
    signInRef(chosenRef)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {step === 'pin' ? 'Sign in' : 'Who are you?'}
          </DialogTitle>
          <DialogDescription>
            {step === 'pin'
              ? 'Enter your PIN. Head refs use their personal PIN; line refs use the shared one.'
              : 'Pick your name from the line-ref roster.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'pin' ? (
          <div className="space-y-2">
            <Label htmlFor="auth-pin" className="sr-only">
              PIN
            </Label>
            <Input
              id="auth-pin"
              type="password"
              inputMode="text"
              autoComplete="off"
              maxLength={16}
              placeholder="••••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirm()
              }}
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive font-semibold">{error}</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="auth-ref">Ref</Label>
            {lineRefs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No line refs in the roster. Ask the organiser to add you, or
                use a head-ref personal PIN if you have one.
              </p>
            ) : (
              <Select value={chosenRef} onValueChange={setChosenRef}>
                <SelectTrigger id="auth-ref">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {lineRefs.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={step === 'ref-name' && !chosenRef}>
            {step === 'pin' ? 'Continue' : 'Sign in'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
