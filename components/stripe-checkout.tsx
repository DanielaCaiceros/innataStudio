"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CardElement, Elements, useStripe, useElements } from "@stripe/react-stripe-js"
import { stripePromise } from "@/lib/stripe"
import { Loader2 } from "lucide-react"

interface CheckoutFormProps {
  amount: number // Monto NETO deseado (lo que quieres recibir)
  description: string
  onSuccess: (paymentId: string) => void
  onCancel: () => void
}

// 👉 Función para calcular el monto bruto que se debe cobrar para recibir el neto deseado
function calculateStripeGrossAmount(netAmount: number): number {
  const fixedFee = 3.00
  const percentage = 0.036
  return parseFloat(((netAmount + fixedFee) / (1 - percentage)).toFixed(2))
}

function CheckoutForm({ amount, description, onSuccess, onCancel }: CheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")

  const grossAmount = calculateStripeGrossAmount(amount) // Monto a cobrar incluyendo comisiones
  const totalAmount = parseFloat((grossAmount ).toFixed(2)) // Total final a cobrar

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
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
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(totalAmount * 100), // En centavos
          description,
          email,
          name,
        }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        data.clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name,
              email,
            },
          },
        }
      )

      if (stripeError) {
        throw new Error(stripeError.message)
      }

      if (paymentIntent.status === 'succeeded') {
        onSuccess(paymentIntent.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar el pago")
    } finally {
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre completo"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="card">Información de Tarjeta</Label>
        <div className="rounded-md border border-gray-200 p-3">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#424770",
                  "::placeholder": {
                    color: "#aab7c4",
                  },
                },
                invalid: {
                  color: "#9e2146",
                },
              },
            }}
          />
        </div>
      </div>
      {error && <div className="text-sm text-red-500">{error}</div>}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Subtotal</span>
          <span>${grossAmount.toFixed(2)}</span>
        </div>

        <div className="flex justify-between font-medium">
          <span>Total</span>
          <span>${totalAmount.toFixed(2)}</span>
        </div>
      </div>
      <div className="flex flex-col space-y-2">
        <Button type="submit" disabled={!stripe || processing} className="bg-[#CA7842] hover:bg-[#CA7842] text-white">
          {processing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...
            </>
          ) : (
            `Pagar $${totalAmount.toFixed(2)}`
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={processing}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

export function StripeCheckout({ amount, description, onSuccess, onCancel }: CheckoutFormProps) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm amount={amount} description={description} onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  )
}
