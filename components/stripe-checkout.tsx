"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CardElement, Elements, useStripe, useElements } from "@stripe/react-stripe-js"
import { stripePromise } from "@/lib/stripe"
import { Loader2, CheckCircle, Lock } from "lucide-react"

interface CheckoutFormProps {
  amount: number
  description: string
  onSuccess: (paymentId: string) => void
  onCancel: () => void
  name?: string
  email?: string
}

function CheckoutForm({
  amount,
  description,
  onSuccess,
  onCancel,
  name: initialName = "",
  email: initialEmail = "",
  firstName = "",
  lastName = "",
}: CheckoutFormProps & { firstName?: string; lastName?: string }) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  // Stable idempotency key per form instance – prevents duplicate payment intents on retry
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID())
  const defaultName = initialName || (firstName || "") + (lastName ? ` ${lastName}` : "")
  const [email, setEmail] = useState(initialEmail)
  const [name, setName] = useState(defaultName)

  const totalAmount = Number.parseFloat(amount.toString().replace(/[^0-9.]/g, ""))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    // Prevenir reenvío si ya fue enviado exitosamente
    if (submitted) {
      console.log('Payment already submitted, preventing duplicate submission')
      return
    }

    setProcessing(true)
    setError(null)

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      setProcessing(false)
      setError("Error al cargar el formulario de pago")
      return
    }

    try {
      const response = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Math.round(totalAmount * 100),
          description,
          email,
          name,
          idempotencyKey: idempotencyKeyRef.current,
        }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name,
            email,
          },
        },
      })

      if (stripeError) {
        throw new Error(stripeError.message)
      }

      if (paymentIntent.status === "succeeded") {
        setSubmitted(true) // Prevenir reenvíos después de pago exitoso
        onSuccess(paymentIntent.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar el pago")
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border-gray-300 rounded-md"
            required
          />
        </div>

        {/* Card Information */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Datos de tarjeta</label>
          <div className="border border-gray-300 rounded-md px-3 py-3">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: "16px",
                    color: "#1f2937",
                    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    "::placeholder": { color: "#9ca3af" },
                    iconColor: "#6b7280",
                  },
                  invalid: {
                    color: "#ef4444",
                    iconColor: "#ef4444",
                  },
                },
                hidePostalCode: true,
              }}
            />
          </div>
        </div>

        {/* Name on card */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
            Nombre en la tarjeta
          </label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border-gray-300 rounded-md"
            required
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Security badge */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 py-1">
          <Lock className="h-3 w-3" />
          Pago seguro con Stripe. Tus datos están cifrados.
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={processing || submitted}
            className="flex-1 border-gray-200 text-gray-600"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={!stripe || processing || submitted}
            className="flex-[2] bg-[#4A102A] hover:bg-[#85193C] text-white font-medium"
          >
            {submitted ? (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Pago procesado
              </span>
            ) : processing ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Procesando...
              </span>
            ) : (
              `Pagar $${totalAmount} MXN`
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

export function StripeCheckout({
  amount,
  description,
  onSuccess,
  onCancel,
  name,
  email,
  firstName,
  lastName,
  ...rest
}: CheckoutFormProps & { firstName?: string; lastName?: string }) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm
        amount={amount}
        description={description}
        onSuccess={onSuccess}
        onCancel={onCancel}
        name={name}
        email={email}
        firstName={firstName}
        lastName={lastName}
        {...rest}
      />
    </Elements>
  )
}
