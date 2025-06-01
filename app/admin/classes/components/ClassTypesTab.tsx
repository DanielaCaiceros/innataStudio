"use client"

import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; // Assuming Card related components are used, verify from page.tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, Search, Clock, Users, Edit, Trash2 } from "lucide-react"; // Verify all icons used
import { useToast } from "@/components/ui/use-toast";
import { ClassType } from "../typesAndConstants"; // Adjusted path

interface ClassTypesTabProps {
  classTypes: ClassType[];
  loadClassTypes: () => Promise<void>;
  // instructors and scheduledClasses might not be needed here, verify from original page.tsx
}

export default function ClassTypesTab({ classTypes, loadClassTypes }: ClassTypesTabProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewClassTypeOpen, setIsNewClassTypeOpen] = useState(false);
  const [newClassTypeForm, setNewClassTypeForm] = useState({
    name: "",
    description: "",
    duration: "45",
    intensity: "",
    category: "",
    capacity: "10",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isEditClassTypeOpen, setIsEditClassTypeOpen] = useState(false);
  const [selectedClassType, setSelectedClassType] = useState<ClassType | null>(null);
  const [editClassTypeForm, setEditClassTypeForm] = useState({
    id: 0,
    name: "",
    description: "",
    duration: "45",
    intensity: "",
    category: "",
    capacity: "10",
  });

  useEffect(() => {
    if (selectedClassType) {
      setEditClassTypeForm({
        id: selectedClassType.id,
        name: selectedClassType.name,
        description: selectedClassType.description || "",
        duration: selectedClassType.duration.toString(),
        intensity: selectedClassType.intensity,
        category: selectedClassType.category,
        capacity: selectedClassType.capacity.toString(),
      });
    }
  }, [selectedClassType]);

  const handleEditClassType = async () => {
    if (!selectedClassType) return;

    if (!editClassTypeForm.name || !editClassTypeForm.duration || !editClassTypeForm.intensity || !editClassTypeForm.category) {
      toast({ title: "Error", description: "Todos los campos obligatorios deben ser completados", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/class-types/${selectedClassType.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editClassTypeForm),
      });

      if (response.ok) {
        toast({ title: "Éxito", description: "Tipo de clase actualizado exitosamente" });
        setIsEditClassTypeOpen(false);
        setSelectedClassType(null);
        await loadClassTypes();
      } else {
        const error = await response.json();
        toast({ title: "Error", description: error.error || "Error al actualizar el tipo de clase", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClassType = async () => {
    if (
      !newClassTypeForm.name ||
      !newClassTypeForm.duration ||
      !newClassTypeForm.intensity ||
      !newClassTypeForm.category
    ) {
      toast({
        title: "Error",
        description: "Todos los campos obligatorios deben ser completados",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/class-types", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newClassTypeForm),
      });

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Tipo de clase creado exitosamente",
        });
        setIsNewClassTypeOpen(false);
        setNewClassTypeForm({
          name: "",
          description: "",
          duration: "45",
          intensity: "",
          category: "",
          capacity: "10",
        });
        await loadClassTypes(); // Reload class types in parent
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Error al crear el tipo de clase",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteClassType = async (classTypeId: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este tipo de clase?")) {
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/class-types/${classTypeId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Tipo de clase eliminado exitosamente",
        });
        await loadClassTypes(); // Reload class types
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Error al eliminar el tipo de clase",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  const filteredClassTypes = classTypes.filter((classType) => {
    return (
      classType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classType.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classType.intensity.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // The JSX for the "Tipos de Clases" tab content will be moved here.
  // This includes the search bar, new class type dialog trigger, and the grid of class type cards.
  // For now, returning a placeholder.
  return (
    <div>
      {/* Search bar and New Class Type Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Buscar por nombre, categoría o intensidad..."
              className="pl-8 bg-white border-gray-200 text-zinc-900 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Dialog open={isNewClassTypeOpen} onOpenChange={setIsNewClassTypeOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#4A102A] hover:bg-[#85193C] text-white">
              <PlusCircle className="h-4 w-4 mr-2" /> Nuevo Tipo de Clase
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white border-gray-200 text-zinc-900">
            <DialogHeader>
              <DialogTitle className="text-[#4A102A]">Crear Nuevo Tipo de Clase</DialogTitle>
              <DialogDescription className="text-gray-600">
                Complete los detalles para crear un nuevo tipo de clase
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Form fields from page.tsx */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre de la Clase</Label>
                  <Input type="text" id="name" placeholder="Ej: POWER CYCLE" className="bg-white border-gray-200 text-zinc-900" value={newClassTypeForm.name} onChange={(e) => setNewClassTypeForm((prev) => ({ ...prev, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoría</Label>
                  <Select value={newClassTypeForm.category} onValueChange={(value) => setNewClassTypeForm((prev) => ({ ...prev, category: value }))}>
                    <SelectTrigger className="bg-white border-gray-200 text-zinc-900"><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 text-zinc-900">
                      <SelectItem value="ritmo">Ritmo</SelectItem>
                      <SelectItem value="potencia">Potencia</SelectItem>
                      <SelectItem value="resistencia">Resistencia</SelectItem>
                      <SelectItem value="hiit">HIIT</SelectItem>
                      <SelectItem value="recuperacion">Recuperación</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duración</Label>
                  <Select value={newClassTypeForm.duration} onValueChange={(value) => setNewClassTypeForm((prev) => ({ ...prev, duration: value }))}>
                    <SelectTrigger className="bg-white border-gray-200 text-zinc-900"><SelectValue placeholder="Seleccionar duración" /></SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 text-zinc-900">
                      <SelectItem value="30">30 minutos</SelectItem>
                      <SelectItem value="45">45 minutos</SelectItem>
                      <SelectItem value="60">60 minutos</SelectItem>
                      <SelectItem value="75">75 minutos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="intensity">Intensidad</Label>
                  <Select value={newClassTypeForm.intensity} onValueChange={(value) => setNewClassTypeForm((prev) => ({ ...prev, intensity: value }))}>
                    <SelectTrigger className="bg-white border-gray-200 text-zinc-900"><SelectValue placeholder="Seleccionar intensidad" /></SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 text-zinc-900">
                      <SelectItem value="baja">Baja</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="media-alta">Media-Alta</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="muy-alta">Muy Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacidad</Label>
                  <Input type="number" id="capacity" placeholder="10" value={newClassTypeForm.capacity} onChange={(e) => setNewClassTypeForm((prev) => ({ ...prev, capacity: e.target.value }))} className="bg-white border-gray-200 text-zinc-900" min="1" max="20"/>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Input type="text" id="description" placeholder="Breve descripción de la clase" className="bg-white border-gray-200 text-zinc-900" value={newClassTypeForm.description} onChange={(e) => setNewClassTypeForm((prev) => ({ ...prev, description: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewClassTypeOpen(false)} className="border-gray-200 text-zinc-900 hover:bg-gray-100">Cancelar</Button>
              <Button className="bg-[#4A102A] hover:bg-[#85193C] text-white" onClick={handleCreateClassType} disabled={isLoading}>{isLoading ? "Creando..." : "Crear Clase"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Grid of Class Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClassTypes.map((classType) => (
          <Card key={classType.id} className="bg-white border-gray-200 hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-[#4A102A]">{classType.name}</h3>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-[#4A102A]" onClick={() => { setSelectedClassType(classType); setIsEditClassTypeOpen(true); }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-[#C5172E]" onClick={() => handleDeleteClassType(classType.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-4">{classType.description}</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="flex items-center text-gray-700 text-sm">
                  <Clock className="h-4 w-4 mr-2 text-[#85193C]" />
                  <span>{classType.duration} min</span>
                </div>
                <div className="flex items-center text-gray-700 text-sm">
                  <Users className="h-4 w-4 mr-2 text-[#85193C]" />
                  <span>Capacidad: {classType.capacity}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 capitalize">Categoría: {classType.category}</span>
                <span className={`px-2 py-1 rounded-full text-xs capitalize ${ classType.intensity === "baja" ? "bg-green-500/20 text-green-700" : classType.intensity === "media" ? "bg-blue-500/20 text-blue-700" : classType.intensity === "media-alta" ? "bg-yellow-500/20 text-yellow-700" : classType.intensity === "alta" ? "bg-orange-500/20 text-orange-700" : "bg-red-500/20 text-red-700"}`}>
                  {classType.intensity}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Class Type Dialog */}
      <Dialog open={isEditClassTypeOpen} onOpenChange={setIsEditClassTypeOpen}>
        <DialogContent className="bg-white border-gray-200 text-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-[#4A102A]">Editar Tipo de Clase</DialogTitle>
            <DialogDescription className="text-gray-600">
              Modifica los detalles del tipo de clase.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editName">Nombre de la Clase</Label>
                <Input type="text" id="editName" placeholder="Ej: POWER CYCLE" className="bg-white border-gray-200 text-zinc-900" value={editClassTypeForm.name} onChange={(e) => setEditClassTypeForm((prev) => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editCategory">Categoría</Label>
                <Select value={editClassTypeForm.category} onValueChange={(value) => setEditClassTypeForm((prev) => ({ ...prev, category: value }))}>
                  <SelectTrigger className="bg-white border-gray-200 text-zinc-900"><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-zinc-900">
                    <SelectItem value="ritmo">Ritmo</SelectItem>
                    <SelectItem value="potencia">Potencia</SelectItem>
                    <SelectItem value="resistencia">Resistencia</SelectItem>
                    <SelectItem value="hiit">HIIT</SelectItem>
                    <SelectItem value="recuperacion">Recuperación</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDuration">Duración</Label>
                <Select value={editClassTypeForm.duration} onValueChange={(value) => setEditClassTypeForm((prev) => ({ ...prev, duration: value }))}>
                  <SelectTrigger className="bg-white border-gray-200 text-zinc-900"><SelectValue placeholder="Seleccionar duración" /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-zinc-900">
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="45">45 minutos</SelectItem>
                    <SelectItem value="60">60 minutos</SelectItem>
                    <SelectItem value="75">75 minutos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editIntensity">Intensidad</Label>
                <Select value={editClassTypeForm.intensity} onValueChange={(value) => setEditClassTypeForm((prev) => ({ ...prev, intensity: value }))}>
                  <SelectTrigger className="bg-white border-gray-200 text-zinc-900"><SelectValue placeholder="Seleccionar intensidad" /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-zinc-900">
                    <SelectItem value="baja">Baja</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="media-alta">Media-Alta</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="muy-alta">Muy Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editCapacity">Capacidad</Label>
                <Input type="number" id="editCapacity" placeholder="10" value={editClassTypeForm.capacity} onChange={(e) => setEditClassTypeForm((prev) => ({ ...prev, capacity: e.target.value }))} className="bg-white border-gray-200 text-zinc-900" min="1" max="20"/>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDescription">Descripción</Label>
              <Input type="text" id="editDescription" placeholder="Breve descripción de la clase" className="bg-white border-gray-200 text-zinc-900" value={editClassTypeForm.description} onChange={(e) => setEditClassTypeForm((prev) => ({ ...prev, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditClassTypeOpen(false); setSelectedClassType(null); }} className="border-gray-200 text-zinc-900 hover:bg-gray-100">Cancelar</Button>
            <Button className="bg-[#4A102A] hover:bg-[#85193C] text-white" onClick={handleEditClassType} disabled={isLoading}>{isLoading ? "Actualizando..." : "Actualizar Tipo de Clase"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
