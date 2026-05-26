'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
  name: z.string().max(120).optional(),
})

type FormValues = z.infer<typeof schema>

type Variant = 'inline' | 'footer' | 'modal'

interface Props {
  variant?: Variant
  className?: string
}

export default function NewsletterForm({ variant = 'inline', className = '' }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'duplicate' | 'error'>(
    'idle'
  )
  const [message, setMessage] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', name: '' },
  })

  async function onSubmit(values: FormValues) {
    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: values.email,
          name: values.name?.trim() || undefined,
        }),
      })
      const json = await res.json()

      if (res.status === 409) {
        setStatus('duplicate')
        setMessage("You're already subscribed")
        return
      }

      if (!res.ok) {
        setStatus('error')
        setMessage(json.error ?? 'Something went wrong. Please try again.')
        return
      }

      setStatus('success')
      setMessage("You're on the list!")
      reset()
    } catch {
      setStatus('error')
      setMessage('Something went wrong. Please try again.')
    }
  }

  const isFooter = variant === 'footer'
  const isModal = variant === 'modal'
  const showName = variant === 'modal'

  if (status === 'success') {
    return (
      <p
        className={className}
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: isFooter ? 13 : 14,
          color: 'var(--accent-gold)',
          letterSpacing: '0.04em',
        }}
      >
        {message}
      </p>
    )
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={`${className} ${variant === 'inline' ? 'flex flex-col sm:flex-row gap-2 w-full' : 'space-y-3'}`}
      noValidate
    >
      {showName && (
        <div>
          <input
            {...register('name')}
            type="text"
            placeholder="Your name (optional)"
            className="input-eclat w-full"
            disabled={status === 'loading'}
          />
        </div>
      )}

      <div className={variant === 'inline' ? 'flex flex-1 gap-2 min-w-0' : ''}>
        <input
          {...register('email')}
          type="email"
          placeholder="your@email.com"
          className={`input-eclat ${variant === 'inline' ? 'flex-1 min-w-0' : 'w-full'}`}
          disabled={status === 'loading'}
          aria-label="Email for newsletter"
          style={
            isFooter
              ? {
                  background: 'rgba(255,255,255,0.04)',
                  borderColor: 'rgba(201,168,76,0.2)',
                }
              : undefined
          }
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className={`btn-gold shrink-0 ${isFooter ? '!py-2.5 !px-4' : ''} ${variant === 'inline' ? '!py-3' : 'w-full'}`}
        >
          {status === 'loading' ? (
            <Loader2 size={16} className="animate-spin mx-auto" />
          ) : (
            'Subscribe'
          )}
        </button>
      </div>

      {errors.email && (
        <p
          className="text-xs w-full"
          style={{ color: 'var(--accent-crimson-light)', fontFamily: 'var(--font-sans)' }}
        >
          {errors.email.message}
        </p>
      )}

      {(status === 'error' || status === 'duplicate') && message && (
        <p
          className="text-xs w-full"
          style={{
            color: status === 'duplicate' ? 'var(--accent-gold)' : 'var(--accent-crimson-light)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {message}
        </p>
      )}
    </form>
  )
}
