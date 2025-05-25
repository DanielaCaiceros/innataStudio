"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { format } from "date-fns"
import { PlusCircle, Search, Download, CreditCard, DollarSign, Receipt, ArrowUpRight } from "lucide-react"

// Datos de ejemplo
const payments = [
  {
    id: 1,
    user: "María García",
    email: "maria@example.com",
    package: "PAQUETE 10 CLASES",
    amount: "$200",
    date: "2023-04-15",
    method: "Tarjeta de crédito",
    status: "completed",
    invoice: "INV-2023-001",
  },
  {
    id: 2,
    user: "Juan Pérez",
    email: "juan@example.com",
    package: "MEMBRESÍA MENSUAL",
    amount: "$350",
    date: "2023-04-10",
    method: "Transferencia bancaria",
    status: "completed",
    invoice: "INV-2023-002",
  },
  {
    id: 3,
    user: "Ana Rodríguez",
    email: "ana@example.com",
    package: "PASE INDIVIDUAL",
    amount: "$25",
    date: "2023-04-20",
    method: "Efectivo",
    status: "pending",
    invoice: "INV-2023-003",
  },
  {
    id: 4,
    user: "Carlos López",
    email: "carlos@example.com",
    package: "PAQUETE 5 CLASES",
    amount: "$110",
    date: "2023-04-18",
    method: "Tarjeta de débito",
    status: "completed",
    invoice: "INV-2023-004",
  },
  {
    id: 5,
    user: "Laura Martínez",
    email: "laura@example.com",
    package: "PASE INDIVIDUAL",
    amount: "$25",
    date: "2023-04-22",
    method: "Efectivo",
    status: "completed",
    invoice: "INV-2023-005",
  },
  {
    id: 6,
    user: "Roberto Sánchez",
    email: "roberto@example.com",
    package: "PAQUETE 10 CLASES",
    amount: "$200",
    date: "2023-04-05",
    method: "Tarjeta de crédito",
    status: "completed",
    invoice: "INV-2023-006",
  },
  {
    id: 7,
    user: "Patricia Gómez",
    email: "patricia@example.com",
    package: "MEMBRESÍA MENSUAL",
    amount: "$350",
    date: "2023-04-01",
    method: "Transferencia bancaria",
    status: "completed",
    invoice: "INV-2023-007",
  },
  {
    id: 8,
    user: "Miguel Torres",
    email: "miguel@example.com",
    package: "PAQUETE 5 CLASES",
    amount: "$110",
    date: "2023-04-12",
    method: "Tarjeta de débito",
    status: "pending",
    invoice: "INV-2023-008",
  },
]

export default function PaymentsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isNewPaymentOpen, setIsNewPaymentOpen] = useState(false)
  const [date, setDate] = useState<Date | undefined>(new Date())

  // Filtrar pagos
  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.package.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.invoice.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || payment.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
      <div className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold">Gestión de Pagos</h1>
            <p className="text-gray-400">Administra todos los pagos y transacciones</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Dialog open={isNewPaymentOpen} onOpenChange={setIsNewPaymentOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-500 hover:bg-blue-600">
                  <PlusCircle className="h-4 w-4 mr-2" /> Registrar Pago
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white-900 border-white-800 text-white">
                <DialogHeader>
                  <DialogTitle>Registrar Nuevo Pago</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Complete los detalles para registrar un nuevo pago
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="user">Cliente</Label>
                      <Select>
                        <SelectTrigger className="bg-white-950 border-white-800 text-white">
                          <SelectValue placeholder="Seleccionar cliente" />
                        </SelectTrigger>
                        <SelectContent className="bg-white-950 border-white-800 text-white">
                          <SelectItem value="maria">María García</SelectItem>
                          <SelectItem value="juan">Juan Pérez</SelectItem>
                          <SelectItem value="ana">Ana Rodríguez</SelectItem>
                          <SelectItem value="carlos">Carlos López</SelectItem>
                          <SelectItem value="laura">Laura Martínez</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="package">Paquete</Label>
                      <Select>
                        <SelectTrigger className="bg-white-950 border-white-800 text-white">
                          <SelectValue placeholder="Seleccionar paquete" />
                        </SelectTrigger>
                        <SelectContent className="bg-white-950 border-white-800 text-white">
                          <SelectItem value="individual">PASE INDIVIDUAL - $25</SelectItem>
                          <SelectItem value="5classes">PAQUETE 5 CLASES - $110</SelectItem>
                          <SelectItem value="10classes">PAQUETE 10 CLASES - $200</SelectItem>
                          <SelectItem value="monthly">MEMBRESÍA MENSUAL - $350</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="amount">Monto</Label>
                      <Input
                        type="text"
                        id="amount"
                        placeholder="$0.00"
                        className="bg-white-950 border-white-800 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date">Fecha</Label>
                      <Input
                        type="date"
                        id="date"
                        className="bg-white-950 border-white-800 text-white"
                        value={date ? format(date, "yyyy-MM-dd") : ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="method">Método de Pago</Label>
                      <Select>
                        <SelectTrigger className="bg-white-950 border-white-800 text-white">
                          <SelectValue placeholder="Seleccionar método" />
                        </SelectTrigger>
                        <SelectContent className="bg-white-950 border-white-800 text-white">
                          <SelectItem value="credit">Tarjeta de crédito</SelectItem>
                          <SelectItem value="debit">Tarjeta de débito</SelectItem>
                          <SelectItem value="transfer">Transferencia bancaria</SelectItem>
                          <SelectItem value="cash">Efectivo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Estado</Label>
                      <Select defaultValue="completed">
                        <SelectTrigger className="bg-white-950 border-white-800 text-white">
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                        <SelectContent className="bg-white-950 border-white-800 text-white">
                          <SelectItem value="completed">Completado</SelectItem>
                          <SelectItem value="pending">Pendiente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notas</Label>
                    <Input
                      type="text"
                      id="notes"
                      placeholder="Notas adicionales"
                      className="bg-white-950 border-white-800 text-white"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsNewPaymentOpen(false)}
                    className="border-white-700 text-white hover:bg-white-800"
                  >
                    Cancelar
                  </Button>
                  <Button className="bg-blue-500 hover:bg-blue-600" onClick={() => setIsNewPaymentOpen(false)}>
                    Registrar Pago
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button variant="outline" className="border-white-700 text-white hover:bg-white-800">
              <Download className="h-4 w-4 mr-2" /> Exportar
            </Button>
          </div>
        </div>

        <Card className="bg-white-900 border-white-800">
          <CardHeader>
            <CardTitle className="text-lg">Historial de Pagos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Buscar por cliente, paquete o factura..."
                  className="pl-8 bg-white-950 border-white-800 text-white w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white-950 border-white-800 text-white w-full sm:w-[180px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent className="bg-white-950 border-white-800 text-white">
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="completed">Completados</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white-800">
                    <th className="text-left p-4 font-medium text-gray-400">ID</th>
                    <th className="text-left p-4 font-medium text-gray-400">Cliente</th>
                    <th className="text-left p-4 font-medium text-gray-400">Paquete</th>
                    <th className="text-left p-4 font-medium text-gray-400">Monto</th>
                    <th className="text-left p-4 font-medium text-gray-400">Fecha</th>
                    <th className="text-left p-4 font-medium text-gray-400">Método</th>
                    <th className="text-left p-4 font-medium text-gray-400">Estado</th>
                    <th className="text-left p-4 font-medium text-gray-400">Factura</th>
                    <th className="text-left p-4 font-medium text-gray-400">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.length > 0 ? (
                    filteredPayments.map((payment) => (
                      <tr key={payment.id} className="border-b border-white-800">
                        <td className="p-4">#{payment.id}</td>
                        <td className="p-4">
                          <div>
                            <div className="font-medium">{payment.user}</div>
                            <div className="text-sm text-gray-400">{payment.email}</div>
                          </div>
                        </td>
                        <td className="p-4">{payment.package}</td>
                        <td className="p-4 font-medium">{payment.amount}</td>
                        <td className="p-4">{payment.date}</td>
                        <td className="p-4">{payment.method}</td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              payment.status === "completed"
                                ? "bg-green-500/20 text-green-500"
                                : "bg-yellow-500/20 text-yellow-500"
                            }`}
                          >
                            {payment.status === "completed" ? "Completado" : "Pendiente"}
                          </span>
                        </td>
                        <td className="p-4">{payment.invoice}</td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 border-white-700 text-white hover:bg-white-800"
                            >
                              Ver
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 border-white-700 text-white hover:bg-white-800"
                            >
                              Factura
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="p-4 text-center text-gray-400">
                        No se encontraron pagos con los filtros aplicados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
  )
}
