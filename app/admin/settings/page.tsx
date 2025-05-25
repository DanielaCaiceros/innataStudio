"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mail, Bell, Shield, CreditCard, Building, Clock, Receipt } from "lucide-react"

export default function SettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [smsNotifications, setSmsNotifications] = useState(true)
  const [reminderTime, setReminderTime] = useState("24")

  return (
      <div className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold">Configuración</h1>
            <p className="text-gray-400">Administra la configuración del sistema</p>
          </div>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-8">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
            <TabsTrigger value="security">Seguridad</TabsTrigger>
            <TabsTrigger value="payments">Pagos</TabsTrigger>
            <TabsTrigger value="business">Negocio</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-lg">Información del Estudio</CardTitle>
                  <CardDescription className="text-gray-400">
                    Actualiza la información básica de tu estudio
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="studio-name">Nombre del Estudio</Label>
                      <Input
                        id="studio-name"
                        defaultValue="CycleStudio"
                        className="bg-zinc-950 border-zinc-800 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Dirección</Label>
                      <Input
                        id="address"
                        defaultValue="Av. Principal #123, Ciudad"
                        className="bg-zinc-950 border-zinc-800 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Teléfono</Label>
                      <Input
                        id="phone"
                        defaultValue="(123) 456-7890"
                        className="bg-zinc-950 border-zinc-800 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Correo Electrónico</Label>
                      <Input
                        id="email"
                        defaultValue="info@cyclestudio.com"
                        className="bg-zinc-950 border-zinc-800 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website">Sitio Web</Label>
                      <Input
                        id="website"
                        defaultValue="www.cyclestudio.com"
                        className="bg-zinc-950 border-zinc-800 text-white"
                      />
                    </div>

                    <Button className="bg-blue-500 hover:bg-blue-600 w-full">Guardar Cambios</Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-lg">Horarios de Operación</CardTitle>
                  <CardDescription className="text-gray-400">
                    Configura los horarios de apertura y cierre
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 items-center">
                      <div className="font-medium">Lunes - Viernes</div>
                      <div>
                        <Input type="time" defaultValue="06:00" className="bg-zinc-950 border-zinc-800 text-white" />
                      </div>
                      <div>
                        <Input type="time" defaultValue="22:00" className="bg-zinc-950 border-zinc-800 text-white" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 items-center">
                      <div className="font-medium">Sábado</div>
                      <div>
                        <Input type="time" defaultValue="08:00" className="bg-zinc-950 border-zinc-800 text-white" />
                      </div>
                      <div>
                        <Input type="time" defaultValue="20:00" className="bg-zinc-950 border-zinc-800 text-white" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 items-center">
                      <div className="font-medium">Domingo</div>
                      <div>
                        <Input type="time" defaultValue="09:00" className="bg-zinc-950 border-zinc-800 text-white" />
                      </div>
                      <div>
                        <Input type="time" defaultValue="14:00" className="bg-zinc-950 border-zinc-800 text-white" />
                      </div>
                    </div>

                    <div className="space-y-2 pt-4">
                      <Label htmlFor="holiday-message">Mensaje de Días Festivos</Label>
                      <Textarea
                        id="holiday-message"
                        placeholder="Mensaje para mostrar en días festivos"
                        className="bg-zinc-950 border-zinc-800 text-white"
                      />
                    </div>

                    <Button className="bg-blue-500 hover:bg-blue-600 w-full">Guardar Cambios</Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-lg">Configuración de Reservaciones</CardTitle>
                  <CardDescription className="text-gray-400">
                    Establece las reglas para las reservaciones
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="max-reservations">Máximo de Reservaciones por Usuario (por día)</Label>
                      <Input
                        id="max-reservations"
                        type="number"
                        defaultValue="2"
                        className="bg-zinc-950 border-zinc-800 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cancellation-time">Tiempo Límite para Cancelaciones (horas)</Label>
                      <Input
                        id="cancellation-time"
                        type="number"
                        defaultValue="4"
                        className="bg-zinc-950 border-zinc-800 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="booking-window">Ventana de Reservación (días)</Label>
                      <Input
                        id="booking-window"
                        type="number"
                        defaultValue="14"
                        className="bg-zinc-950 border-zinc-800 text-white"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="waitlist">Habilitar Lista de Espera</Label>
                      <Switch id="waitlist" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-confirm">Confirmación Automática de Reservaciones</Label>
                      <Switch id="auto-confirm" defaultChecked />
                    </div>

                    <Button className="bg-blue-500 hover:bg-blue-600 w-full">Guardar Cambios</Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-lg">Personalización</CardTitle>
                  <CardDescription className="text-gray-400">
                    Personaliza la apariencia de tu plataforma
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="primary-color">Color Primario</Label>
                      <div className="flex gap-2">
                        <Input
                          id="primary-color"
                          type="color"
                          defaultValue="#e11d48"
                          className="w-12 h-10 p-1 bg-zinc-950 border-zinc-800"
                        />
                        <Input
                          type="text"
                          defaultValue="#e11d48"
                          className="flex-1 bg-zinc-950 border-zinc-800 text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="logo">Logo</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="logo"
                          type="file"
                          className="bg-zinc-950 border-zinc-800 text-white"
                          accept="image/*"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="favicon">Favicon</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="favicon"
                          type="file"
                          className="bg-zinc-950 border-zinc-800 text-white"
                          accept="image/*"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="welcome-message">Mensaje de Bienvenida</Label>
                      <Textarea
                        id="welcome-message"
                        placeholder="Mensaje de bienvenida para nuevos usuarios"
                        className="bg-zinc-950 border-zinc-800 text-white"
                        defaultValue="¡Bienvenido a CycleStudio! Estamos emocionados de tenerte con nosotros."
                      />
                    </div>

                    <Button className="bg-blue-500 hover:bg-blue-600 w-full">Guardar Cambios</Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-lg">Notificaciones por Correo</CardTitle>
                  </div>
                  <CardDescription className="text-gray-400">
                    Configura las notificaciones por correo electrónico
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="email-notifications">Habilitar Notificaciones por Correo</Label>
                      <Switch
                        id="email-notifications"
                        checked={emailNotifications}
                        onCheckedChange={setEmailNotifications}
                      />
                    </div>

                    <div className="space-y-4 pt-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="booking-confirmation">Confirmación de Reserva</Label>
                        <Switch id="booking-confirmation" defaultChecked disabled={!emailNotifications} />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="booking-reminder">Recordatorio de Clase</Label>
                        <Switch id="booking-reminder" defaultChecked disabled={!emailNotifications} />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="booking-cancellation">Cancelación de Reserva</Label>
                        <Switch id="booking-cancellation" defaultChecked disabled={!emailNotifications} />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="payment-confirmation">Confirmación de Pago</Label>
                        <Switch id="payment-confirmation" defaultChecked disabled={!emailNotifications} />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="package-expiry">Expiración de Paquete</Label>
                        <Switch id="package-expiry" defaultChecked disabled={!emailNotifications} />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="marketing-emails">Correos de Marketing</Label>
                        <Switch id="marketing-emails" defaultChecked disabled={!emailNotifications} />
                      </div>
                    </div>

                    <div className="space-y-2 pt-4">
                      <Label htmlFor="email-footer">Pie de Página de Correos</Label>
                      <Textarea
                        id="email-footer"
                        placeholder="Texto para el pie de página de los correos"
                        className="bg-zinc-950 border-zinc-800 text-white"
                        defaultValue="© 2023 CycleStudio. Todos los derechos reservados."
                        disabled={!emailNotifications}
                      />
                    </div>

                    <Button className="bg-blue-500 hover:bg-blue-600 w-full">Guardar Cambios</Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-lg">Notificaciones SMS</CardTitle>
                  </div>
                  <CardDescription className="text-gray-400">Configura las notificaciones por SMS</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sms-notifications">Habilitar Notificaciones SMS</Label>
                      <Switch id="sms-notifications" checked={smsNotifications} onCheckedChange={setSmsNotifications} />
                    </div>

                    <div className="space-y-4 pt-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="sms-booking-confirmation">Confirmación de Reserva</Label>
                        <Switch id="sms-booking-confirmation" defaultChecked disabled={!smsNotifications} />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="sms-booking-reminder">Recordatorio de Clase</Label>
                        <Switch id="sms-booking-reminder" defaultChecked disabled={!smsNotifications} />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="sms-booking-cancellation">Cancelación de Reserva</Label>
                        <Switch id="sms-booking-cancellation" defaultChecked disabled={!smsNotifications} />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="sms-payment-confirmation">Confirmación de Pago</Label>
                        <Switch id="sms-payment-confirmation" defaultChecked disabled={!smsNotifications} />
                      </div>
                    </div>

                    <div className="space-y-2 pt-4">
                      <Label htmlFor="reminder-time">Tiempo de Recordatorio (horas antes)</Label>
                      <Select value={reminderTime} onValueChange={setReminderTime} disabled={!smsNotifications}>
                        <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white">
                          <SelectValue placeholder="Seleccionar tiempo" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                          <SelectItem value="1">1 hora</SelectItem>
                          <SelectItem value="2">2 horas</SelectItem>
                          <SelectItem value="4">4 horas</SelectItem>
                          <SelectItem value="12">12 horas</SelectItem>
                          <SelectItem value="24">24 horas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sms-provider">Proveedor de SMS</Label>
                      <Select defaultValue="twilio" disabled={!smsNotifications}>
                        <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white">
                          <SelectValue placeholder="Seleccionar proveedor" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                          <SelectItem value="twilio">Twilio</SelectItem>
                          <SelectItem value="nexmo">Nexmo</SelectItem>
                          <SelectItem value="aws">AWS SNS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="api-key">API Key</Label>
                      <Input
                        id="api-key"
                        type="password"
                        placeholder="Ingresa tu API key"
                        className="bg-zinc-950 border-zinc-800 text-white"
                        disabled={!smsNotifications}
                      />
                    </div>

                    <Button className="bg-blue-500 hover:bg-blue-600 w-full">Guardar Cambios</Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="security">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-lg">Seguridad de la Cuenta</CardTitle>
                  </div>
                  <CardDescription className="text-gray-400">
                    Configura las opciones de seguridad para tu cuenta
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Contraseña Actual</Label>
                      <Input
                        id="current-password"
                        type="password"
                        placeholder="Ingresa tu contraseña actual"
                        className="bg-zinc-950 border-zinc-800 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-password">Nueva Contraseña</Label>
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="Ingresa tu nueva contraseña"
                        className="bg-zinc-950 border-zinc-800 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirma tu nueva contraseña"
                        className="bg-zinc-950 border-zinc-800 text-white"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="two-factor">Autenticación de Dos Factores</Label>
                      <Switch id="two-factor" />
                    </div>

                    <Button className="bg-blue-500 hover:bg-blue-600 w-full">Actualizar Contraseña</Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-lg">Permisos de Usuario</CardTitle>
                  </div>
                  <CardDescription className="text-gray-400">
                    Configura los permisos para diferentes roles de usuario
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4">
                    <div className="space-y-2">
                      <Label>Administradores</Label>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="admin-users" className="text-sm">
                            Gestionar Usuarios
                          </Label>
                          <Switch id="admin-users" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="admin-classes" className="text-sm">
                            Gestionar Clases
                          </Label>
                          <Switch id="admin-classes" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="admin-payments" className="text-sm">
                            Gestionar Pagos
                          </Label>
                          <Switch id="admin-payments" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="admin-settings" className="text-sm">
                            Gestionar Configuración
                          </Label>
                          <Switch id="admin-settings" defaultChecked />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Instructores</Label>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="instructor-schedule" className="text-sm">
                            Ver Horario
                          </Label>
                          <Switch id="instructor-schedule" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="instructor-attendance" className="text-sm">
                            Marcar Asistencia
                          </Label>
                          <Switch id="instructor-attendance" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="instructor-profile" className="text-sm">
                            Editar Perfil
                          </Label>
                          <Switch id="instructor-profile" defaultChecked />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Recepcionistas</Label>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="receptionist-bookings" className="text-sm">
                            Gestionar Reservaciones
                          </Label>
                          <Switch id="receptionist-bookings" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="receptionist-payments" className="text-sm">
                            Procesar Pagos
                          </Label>
                          <Switch id="receptionist-payments" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="receptionist-users" className="text-sm">
                            Ver Usuarios
                          </Label>
                          <Switch id="receptionist-users" defaultChecked />
                        </div>
                      </div>
                    </div>

                    <Button className="bg-blue-500 hover:bg-blue-600 w-full">Guardar Cambios</Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="payments">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-lg">Configuración de Pagos</CardTitle>
                  </div>
                  <CardDescription className="text-gray-400">
                    Configura los métodos de pago y procesadores
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="payment-processor">Procesador de Pagos</Label>
                      <Select defaultValue="stripe">
                        <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white">
                          <SelectValue placeholder="Seleccionar procesador" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                          <SelectItem value="stripe">Stripe</SelectItem>
                          <SelectItem value="paypal">PayPal</SelectItem>
                          <SelectItem value="mercadopago">MercadoPago</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="api-key-payment">API Key</Label>
                      <Input
                        id="api-key-payment"
                        type="password"
                        placeholder="Ingresa tu API key"
                        className="bg-zinc-950 border-zinc-800 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="secret-key">Secret Key</Label>
                      <Input
                        id="secret-key"
                        type="password"
                        placeholder="Ingresa tu secret key"
                        className="bg-zinc-950 border-zinc-800 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Métodos de Pago Aceptados</Label>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="credit-card" className="text-sm">
                            Tarjeta de Crédito
                          </Label>
                          <Switch id="credit-card" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="debit-card" className="text-sm">
                            Tarjeta de Débito
                          </Label>
                          <Switch id="debit-card" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="bank-transfer" className="text-sm">
                            Transferencia Bancaria
                          </Label>
                          <Switch id="bank-transfer" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="cash" className="text-sm">
                            Efectivo
                          </Label>
                          <Switch id="cash" defaultChecked />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="currency">Moneda</Label>
                      <Select defaultValue="mxn">
                        <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white">
                          <SelectValue placeholder="Seleccionar moneda" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                          <SelectItem value="mxn">Peso Mexicano (MXN)</SelectItem>
                          <SelectItem value="usd">Dólar Estadounidense (USD)</SelectItem>
                          <SelectItem value="eur">Euro (EUR)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button className="bg-blue-500 hover:bg-blue-600 w-full">Guardar Cambios</Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-lg">Configuración de Facturación</CardTitle>
                  </div>
                  <CardDescription className="text-gray-400">
                    Configura las opciones de facturación y recibos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="tax-rate">Tasa de Impuesto (%)</Label>
                      <Input
                        id="tax-rate"
                        type="number"
                        defaultValue="16"
                        className="bg-zinc-950 border-zinc-800 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="invoice-prefix">Prefijo de Factura</Label>
                      <Input
                        id="invoice-prefix"
                        defaultValue="INV-"
                        className="bg-zinc-950 border-zinc-800 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="invoice-footer">Pie de Página de Factura</Label>
                      <Textarea
                        id="invoice-footer"
                        placeholder="Texto para el pie de página de las facturas"
                        className="bg-zinc-950 border-zinc-800 text-white"
                        defaultValue="Gracias por su compra. Para cualquier consulta, contáctenos en info@cyclestudio.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="invoice-logo">Logo para Facturas</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="invoice-logo"
                          type="file"
                          className="bg-zinc-950 border-zinc-800 text-white"
                          accept="image/*"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-invoice" className="text-sm">
                        Generar Facturas Automáticamente
                      </Label>
                      <Switch id="auto-invoice" defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="email-invoice" className="text-sm">
                        Enviar Facturas por Correo
                      </Label>
                      <Switch id="email-invoice" defaultChecked />
                    </div>

                    <Button className="bg-blue-500 hover:bg-blue-600 w-full">Guardar Cambios</Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="business">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-lg">Información Legal</CardTitle>
                  </div>
                  <CardDescription className="text-gray-400">
                    Configura la información legal de tu negocio
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="legal-name">Razón Social</Label>
                      <Input
                        id="legal-name"
                        defaultValue="CycleStudio S.A. de C.V."
                        className="bg-zinc-950 border-zinc-800 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tax-id">RFC</Label>
                      <Input
                        id="tax-id"
                        defaultValue="CST180515AB3"
                        className="bg-zinc-950 border-zinc-800 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="legal-address">Dirección Fiscal</Label>
                      <Textarea
                        id="legal-address"
                        className="bg-zinc-950 border-zinc-800 text-white"
                        defaultValue="Av. Principal #123, Col. Centro, Ciudad, CP 12345"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="terms-conditions">Términos y Condiciones</Label>
                      <Textarea
                        id="terms-conditions"
                        className="bg-zinc-950 border-zinc-800 text-white h-32"
                        defaultValue="Al utilizar nuestros servicios, usted acepta cumplir con nuestras políticas y procedimientos..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="privacy-policy">Política de Privacidad</Label>
                      <Textarea
                        id="privacy-policy"
                        className="bg-zinc-950 border-zinc-800 text-white h-32"
                        defaultValue="CycleStudio se compromete a proteger su privacidad. La información personal que recopilamos se utiliza únicamente para..."
                      />
                    </div>

                    <Button className="bg-blue-500 hover:bg-blue-600 w-full">Guardar Cambios</Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-lg">Configuración Avanzada</CardTitle>
                  </div>
                  <CardDescription className="text-gray-400">
                    Opciones avanzadas para la configuración del sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Zona Horaria</Label>
                      <Select defaultValue="america-mexico">
                        <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white">
                          <SelectValue placeholder="Seleccionar zona horaria" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                          <SelectItem value="america-mexico">América/Ciudad de México</SelectItem>
                          <SelectItem value="america-new_york">América/Nueva York</SelectItem>
                          <SelectItem value="america-los_angeles">América/Los Ángeles</SelectItem>
                          <SelectItem value="europe-madrid">Europa/Madrid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date-format">Formato de Fecha</Label>
                      <Select defaultValue="dd-mm-yyyy">
                        <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white">
                          <SelectValue placeholder="Seleccionar formato" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                          <SelectItem value="dd-mm-yyyy">DD/MM/YYYY</SelectItem>
                          <SelectItem value="mm-dd-yyyy">MM/DD/YYYY</SelectItem>
                          <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="language">Idioma</Label>
                      <Select defaultValue="es">
                        <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white">
                          <SelectValue placeholder="Seleccionar idioma" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                          <SelectItem value="es">Español</SelectItem>
                          <SelectItem value="en">Inglés</SelectItem>
                          <SelectItem value="fr">Francés</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="maintenance-mode" className="text-sm">
                        Modo de Mantenimiento
                      </Label>
                      <Switch id="maintenance-mode" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maintenance-message">Mensaje de Mantenimiento</Label>
                      <Textarea
                        id="maintenance-message"
                        className="bg-zinc-950 border-zinc-800 text-white"
                        placeholder="Mensaje a mostrar durante el mantenimiento"
                        defaultValue="Estamos realizando mejoras en nuestro sistema. Por favor, vuelva más tarde."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="backup-frequency">Frecuencia de Respaldo</Label>
                      <Select defaultValue="daily">
                        <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white">
                          <SelectValue placeholder="Seleccionar frecuencia" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                          <SelectItem value="hourly">Cada hora</SelectItem>
                          <SelectItem value="daily">Diario</SelectItem>
                          <SelectItem value="weekly">Semanal</SelectItem>
                          <SelectItem value="monthly">Mensual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button className="bg-blue-500 hover:bg-blue-600 w-full">Guardar Cambios</Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
  )
}
