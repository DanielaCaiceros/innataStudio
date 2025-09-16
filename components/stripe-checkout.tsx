"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CardElement, Elements, useStripe, useElements } from "@stripe/react-stripe-js"
import { stripePromise } from "@/lib/stripe"
import { Loader2, CheckCircle } from "lucide-react"

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

    const paymentMethodCard = cardElement as any

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
        }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: paymentMethodCard,
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
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-semibold text-gray-900 mb-8">Pago con Tarjeta</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* Card Information */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Número de tarjeta</label>
          <div className="border border-gray-300 rounded-md">
            <div className="px-3 py-3 border-b border-gray-300">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: "16px",
                      color: "#1f2937",
                      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      "::placeholder": {
                        color: "#9ca3af",
                      },
                      iconColor: "#6b7280",
                    },
                    invalid: {
                      color: "#ef4444",
                      iconColor: "#ef4444",
                    },
                  },
                  hidePostalCode: false,
                }}
              />
            </div>
          </div>
        </div>

        {/* Name on card */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Nombre
          </label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}


        {/* Pay Button */}
        <Button
          type="submit"
          disabled={!stripe || processing || submitted}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-4 rounded-md text-base transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitted ? (
            <div className="flex items-center justify-center">
              <CheckCircle className="mr-2 h-4 w-4" />
              Pago procesado
            </div>
          ) : processing ? (
            <div className="flex items-center justify-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Procesando pago...
            </div>
          ) : (
            "Pagar"
          )}
        </Button>
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
