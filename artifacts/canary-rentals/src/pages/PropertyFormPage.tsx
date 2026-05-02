import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetProperty,
  useCreateProperty,
  useUpdateProperty,
  getListPropertiesQueryKey,
  getGetPropertyQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, Image, GripVertical, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface FormValues {
  name: string;
  location: string;
  description: string;
  vvLicense: string;
  igicEnabled: boolean;
  nightly_rate: string;
  max_guests: string;
  photos: string[];
  icalImportUrls: string[];
}

const EMPTY_FORM: FormValues = {
  name: "",
  location: "",
  description: "",
  vvLicense: "",
  igicEnabled: false,
  nightly_rate: "",
  max_guests: "",
  photos: [],
  icalImportUrls: [],
};

export default function PropertyFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const propertyId = isEdit ? parseInt(id, 10) : 0;
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: existing, isLoading } = useGetProperty(propertyId, {
    query: {
      enabled: isEdit && !!propertyId,
      queryKey: getGetPropertyQueryKey(propertyId),
    },
  });

  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();

  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [newPhoto, setNewPhoto] = useState("");
  const [newIcal, setNewIcal] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name ?? "",
        location: existing.location ?? "",
        description: existing.description ?? "",
        vvLicense: existing.vvLicense ?? "",
        igicEnabled: existing.igicEnabled ?? false,
        nightly_rate: existing.nightly_rate != null ? String(existing.nightly_rate) : "",
        max_guests: existing.max_guests != null ? String(existing.max_guests) : "",
        photos: existing.photos ?? [],
        icalImportUrls: existing.icalImportUrls ?? [],
      });
    }
  }, [existing]);

  const set = (key: keyof FormValues, value: FormValues[keyof FormValues]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const addPhoto = () => {
    const url = newPhoto.trim();
    if (!url) return;
    if (!url.startsWith("http")) {
      toast.error("Inserisci un URL valido che inizia con http");
      return;
    }
    set("photos", [...form.photos, url]);
    setNewPhoto("");
  };

  const removePhoto = (idx: number) =>
    set("photos", form.photos.filter((_, i) => i !== idx));

  const addIcal = () => {
    const url = newIcal.trim();
    if (!url) return;
    set("icalImportUrls", [...form.icalImportUrls, url]);
    setNewIcal("");
  };

  const removeIcal = (idx: number) =>
    set("icalImportUrls", form.icalImportUrls.filter((_, i) => i !== idx));

  const validate = (): string | null => {
    if (!form.name.trim()) return "Il nome è obbligatorio";
    if (!form.location.trim()) return "La posizione è obbligatoria";
    if (!form.vvLicense.trim()) return "La licenza VV è obbligatoria";
    if (!form.nightly_rate || isNaN(Number(form.nightly_rate)) || Number(form.nightly_rate) < 0)
      return "Inserisci una tariffa notturna valida";
    if (!form.max_guests || isNaN(Number(form.max_guests)) || Number(form.max_guests) < 1)
      return "Inserisci un numero ospiti valido";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { toast.error(err); return; }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        location: form.location.trim(),
        description: form.description.trim() || undefined,
        vvLicense: form.vvLicense.trim(),
        igicEnabled: form.igicEnabled,
        nightly_rate: Number(form.nightly_rate),
        max_guests: Math.round(Number(form.max_guests)),
        photos: form.photos,
        icalImportUrls: form.icalImportUrls,
      };

      if (isEdit) {
        await updateProperty.mutateAsync({ id: propertyId, data: payload });
        await queryClient.invalidateQueries({ queryKey: getGetPropertyQueryKey(propertyId) });
        await queryClient.invalidateQueries({ queryKey: getListPropertiesQueryKey() });
        toast.success("Proprietà aggiornata con successo");
        setLocation(`/properties/${propertyId}`);
      } else {
        const created = await createProperty.mutateAsync({ data: payload });
        await queryClient.invalidateQueries({ queryKey: getListPropertiesQueryKey() });
        toast.success("Proprietà creata con successo");
        setLocation(`/properties/${created.id}`);
      }
    } catch {
      toast.error(isEdit ? "Errore durante l'aggiornamento" : "Errore durante la creazione");
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && isLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  const title = isEdit ? `Modifica: ${existing?.name ?? "Proprietà"}` : "Aggiungi Proprietà";

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setLocation(isEdit ? `/properties/${propertyId}` : "/properties")}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">
            {isEdit ? "Modifica tutti i dettagli della proprietà" : "Compila i dettagli della nuova proprietà"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informazioni di base */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informazioni di base</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome proprietà *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Villa Atlántico"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vvLicense">Licenza VV *</Label>
                <Input
                  id="vvLicense"
                  value={form.vvLicense}
                  onChange={(e) => set("vvLicense", e.target.value)}
                  placeholder="VV-38-001234"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location">Posizione *</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="Playa de Las Américas, Tenerife"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Descrizione</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Descrivi la proprietà per i potenziali ospiti..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tariffe e capacità */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tariffe e capacità</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="nightly_rate">Tariffa notturna (€) *</Label>
                <Input
                  id="nightly_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.nightly_rate}
                  onChange={(e) => set("nightly_rate", e.target.value)}
                  placeholder="150"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="max_guests">Ospiti massimi *</Label>
                <Input
                  id="max_guests"
                  type="number"
                  min="1"
                  step="1"
                  value={form.max_guests}
                  onChange={(e) => set("max_guests", e.target.value)}
                  placeholder="6"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="igic">IGIC (7%)</Label>
                <p className="text-sm text-muted-foreground">
                  Applica l'imposta turistica delle Canarie
                </p>
              </div>
              <Switch
                id="igic"
                checked={form.igicEnabled}
                onCheckedChange={(v) => set("igicEnabled", v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Foto */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Image className="h-4 w-4" />
              Foto della proprietà
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {form.photos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {form.photos.map((url, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden border bg-muted aspect-video">
                    <img
                      src={url}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='60' viewBox='0 0 100 60'%3E%3Crect width='100' height='60' fill='%23f1f5f9'/%3E%3Ctext x='50' y='35' text-anchor='middle' fill='%2394a3b8' font-size='10'%3EImmagine non valida%3C/text%3E%3C/svg%3E";
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-full bg-white/90 hover:bg-white"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-gray-700" />
                      </a>
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="p-1.5 rounded-full bg-white/90 hover:bg-white"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </div>
                    <Badge
                      variant="secondary"
                      className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0"
                    >
                      {idx + 1}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={newPhoto}
                onChange={(e) => setNewPhoto(e.target.value)}
                placeholder="https://esempio.com/foto.jpg"
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addPhoto(); }
                }}
              />
              <Button type="button" variant="secondary" onClick={addPhoto} className="shrink-0">
                <Plus className="h-4 w-4 mr-1" />
                Aggiungi
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Incolla l'URL di un'immagine (es. da Unsplash, Google Drive condiviso, ecc.)
            </p>
          </CardContent>
        </Card>

        {/* URL iCal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <GripVertical className="h-4 w-4" />
              URL iCal importazione
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {form.icalImportUrls.length > 0 && (
              <div className="space-y-2">
                {form.icalImportUrls.map((url, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                    <span className="flex-1 text-xs font-mono text-muted-foreground truncate">
                      {url}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => removeIcal(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={newIcal}
                onChange={(e) => setNewIcal(e.target.value)}
                placeholder="https://airbnb.com/calendar/ical/..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addIcal(); }
                }}
              />
              <Button type="button" variant="secondary" onClick={addIcal} className="shrink-0">
                <Plus className="h-4 w-4 mr-1" />
                Aggiungi
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-3 pb-8">
          <Button type="submit" disabled={saving} className="min-w-[140px]">
            {saving
              ? isEdit ? "Salvataggio..." : "Creazione..."
              : isEdit ? "Salva modifiche" : "Crea proprietà"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation(isEdit ? `/properties/${propertyId}` : "/properties")}
          >
            Annulla
          </Button>
        </div>
      </form>
    </div>
  );
}
