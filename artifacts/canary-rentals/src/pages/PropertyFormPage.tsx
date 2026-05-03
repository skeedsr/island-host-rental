import { useState, useEffect, useRef } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, ImagePlus, GripVertical, Upload, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";

interface VacationalForm {
  enabled: boolean;
  dailyRate: string;
}

interface TemporadaForm {
  enabled: boolean;
  monthlyRate: string;
  maxDurationMonths: string;
  internetIncluded: boolean;
  electricityIncluded: boolean;
  waterIncluded: boolean;
  communityFeesIncluded: boolean;
}

interface RentalTypesForm {
  vacational: VacationalForm;
  mediaTemporada: TemporadaForm;
  largaTemporada: TemporadaForm;
}

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
  rentalTypes: RentalTypesForm;
}

const DEFAULT_TEMPORADA: TemporadaForm = {
  enabled: false,
  monthlyRate: "",
  maxDurationMonths: "6",
  internetIncluded: false,
  electricityIncluded: false,
  waterIncluded: false,
  communityFeesIncluded: false,
};

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
  rentalTypes: {
    vacational: { enabled: true, dailyRate: "" },
    mediaTemporada: { ...DEFAULT_TEMPORADA },
    largaTemporada: { ...DEFAULT_TEMPORADA },
  },
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
  const [newIcal, setNewIcal] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile, isUploading, progress } = usePhotoUpload({
    onSuccess: (result) => {
      setForm((f) => ({ ...f, photos: [...f.photos, result.servingUrl] }));
      toast.success("Foto caricata con successo");
    },
    onError: (err) => {
      toast.error(`Errore upload: ${err.message}`);
    },
  });

  useEffect(() => {
    if (existing) {
      const rt = existing.rentalTypes as RentalTypesForm | null | undefined;
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
        rentalTypes: {
          vacational: {
            enabled: rt?.vacational?.enabled ?? true,
            dailyRate: rt?.vacational?.dailyRate != null
              ? String(rt.vacational.dailyRate)
              : existing.nightly_rate != null ? String(existing.nightly_rate) : "",
          },
          mediaTemporada: {
            enabled: rt?.mediaTemporada?.enabled ?? false,
            monthlyRate: rt?.mediaTemporada?.monthlyRate != null ? String(rt.mediaTemporada.monthlyRate) : "",
            maxDurationMonths: rt?.mediaTemporada?.maxDurationMonths != null ? String(rt.mediaTemporada.maxDurationMonths) : "6",
            internetIncluded: rt?.mediaTemporada?.internetIncluded ?? false,
            electricityIncluded: rt?.mediaTemporada?.electricityIncluded ?? false,
            waterIncluded: rt?.mediaTemporada?.waterIncluded ?? false,
            communityFeesIncluded: rt?.mediaTemporada?.communityFeesIncluded ?? false,
          },
          largaTemporada: {
            enabled: rt?.largaTemporada?.enabled ?? false,
            monthlyRate: rt?.largaTemporada?.monthlyRate != null ? String(rt.largaTemporada.monthlyRate) : "",
            maxDurationMonths: "6",
            internetIncluded: rt?.largaTemporada?.internetIncluded ?? false,
            electricityIncluded: rt?.largaTemporada?.electricityIncluded ?? false,
            waterIncluded: rt?.largaTemporada?.waterIncluded ?? false,
            communityFeesIncluded: rt?.largaTemporada?.communityFeesIncluded ?? false,
          },
        },
      });
    }
  }, [existing]);

  const set = (key: keyof FormValues, value: FormValues[keyof FormValues]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setVacational = (patch: Partial<VacationalForm>) =>
    setForm((f) => ({ ...f, rentalTypes: { ...f.rentalTypes, vacational: { ...f.rentalTypes.vacational, ...patch } } }));

  const setMediaTemporada = (patch: Partial<TemporadaForm>) =>
    setForm((f) => ({ ...f, rentalTypes: { ...f.rentalTypes, mediaTemporada: { ...f.rentalTypes.mediaTemporada, ...patch } } }));

  const setLargaTemporada = (patch: Partial<TemporadaForm>) =>
    setForm((f) => ({ ...f, rentalTypes: { ...f.rentalTypes, largaTemporada: { ...f.rentalTypes.largaTemporada, ...patch } } }));

  const removePhoto = (idx: number) =>
    set("photos", form.photos.filter((_, i) => i !== idx));

  const movePhoto = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= form.photos.length) return;
    const arr = [...form.photos];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    set("photos", arr);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    e.target.value = "";
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name}: solo immagini consentite`);
        continue;
      }
      await uploadFile(file);
    }
  };

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
    const rt = form.rentalTypes;
    if (rt.vacational.enabled && (rt.vacational.dailyRate === "" || isNaN(Number(rt.vacational.dailyRate))))
      return "Inserisci una tariffa giornaliera valida per Vacational";
    if (rt.mediaTemporada.enabled && (rt.mediaTemporada.monthlyRate === "" || isNaN(Number(rt.mediaTemporada.monthlyRate))))
      return "Inserisci una tariffa mensile valida per Media Temporada";
    if (rt.largaTemporada.enabled && (rt.largaTemporada.monthlyRate === "" || isNaN(Number(rt.largaTemporada.monthlyRate))))
      return "Inserisci una tariffa mensile valida per Larga Temporada";
    return null;
  };

  const buildRentalTypes = () => {
    const rt = form.rentalTypes;
    return {
      vacational: rt.vacational.enabled ? {
        enabled: true,
        dailyRate: Number(rt.vacational.dailyRate),
      } : undefined,
      mediaTemporada: rt.mediaTemporada.enabled ? {
        enabled: true,
        monthlyRate: Number(rt.mediaTemporada.monthlyRate),
        maxDurationMonths: Number(rt.mediaTemporada.maxDurationMonths) || 6,
        internetIncluded: rt.mediaTemporada.internetIncluded,
        electricityIncluded: rt.mediaTemporada.electricityIncluded,
        waterIncluded: rt.mediaTemporada.waterIncluded,
        communityFeesIncluded: rt.mediaTemporada.communityFeesIncluded,
      } : undefined,
      largaTemporada: rt.largaTemporada.enabled ? {
        enabled: true,
        monthlyRate: Number(rt.largaTemporada.monthlyRate),
        internetIncluded: rt.largaTemporada.internetIncluded,
        electricityIncluded: rt.largaTemporada.electricityIncluded,
        waterIncluded: rt.largaTemporada.waterIncluded,
        communityFeesIncluded: rt.largaTemporada.communityFeesIncluded,
      } : undefined,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const err = validate();
    if (err) {
      setFormError(err);
      toast.error(err);
      return;
    }

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
        rentalTypes: buildRentalTypes(),
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
    } catch (err: unknown) {
      const apiErr = err as { data?: { error?: unknown }; status?: number } | undefined;
      let msg = isEdit ? "Errore durante l'aggiornamento della proprietà." : "Errore durante la creazione della proprietà.";
      if (apiErr?.status === 400 && apiErr?.data?.error) {
        msg = `Dati non validi: controlla i campi del form.`;
      } else if (apiErr?.status === 403) {
        msg = "Non hai i permessi per modificare questa proprietà.";
      }
      setFormError(msg);
      toast.error(msg);
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

        {/* Tipologie di affitto */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tipologie di affitto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Vacational */}
            <div className="rounded-lg border overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setVacational({ enabled: !form.rentalTypes.vacational.enabled })}
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={form.rentalTypes.vacational.enabled}
                    onCheckedChange={(v) => setVacational({ enabled: v })}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div>
                    <p className="font-medium text-sm">Vacacional</p>
                    <p className="text-xs text-muted-foreground">Affitto turistico a breve termine</p>
                  </div>
                </div>
                {form.rentalTypes.vacational.enabled && (
                  <Badge variant="secondary" className="text-xs">Attivo</Badge>
                )}
              </div>
              {form.rentalTypes.vacational.enabled && (
                <div className="px-4 pb-4 pt-2 border-t bg-muted/10 space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="vac_dailyRate">Tariffa giornaliera (€)</Label>
                    <Input
                      id="vac_dailyRate"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="120"
                      value={form.rentalTypes.vacational.dailyRate}
                      onChange={(e) => setVacational({ dailyRate: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Media Temporada */}
            <div className="rounded-lg border overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setMediaTemporada({ enabled: !form.rentalTypes.mediaTemporada.enabled })}
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={form.rentalTypes.mediaTemporada.enabled}
                    onCheckedChange={(v) => setMediaTemporada({ enabled: v })}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div>
                    <p className="font-medium text-sm">Media Temporada</p>
                    <p className="text-xs text-muted-foreground">Affitto medio termine, fino a 6 mesi</p>
                  </div>
                </div>
                {form.rentalTypes.mediaTemporada.enabled && (
                  <Badge variant="secondary" className="text-xs">Attivo</Badge>
                )}
              </div>
              {form.rentalTypes.mediaTemporada.enabled && (
                <div className="px-4 pb-4 pt-2 border-t bg-muted/10 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="mt_monthlyRate">Tariffa mensile (€)</Label>
                      <Input
                        id="mt_monthlyRate"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="800"
                        value={form.rentalTypes.mediaTemporada.monthlyRate}
                        onChange={(e) => setMediaTemporada({ monthlyRate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="mt_maxDuration">Durata massima</Label>
                      <Select
                        value={form.rentalTypes.mediaTemporada.maxDurationMonths}
                        onValueChange={(v) => setMediaTemporada({ maxDurationMonths: v })}
                      >
                        <SelectTrigger id="mt_maxDuration">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n} {n === 1 ? "mese" : "mesi"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Spese incluse</p>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        ["internetIncluded", "Internet"],
                        ["electricityIncluded", "Luce"],
                        ["waterIncluded", "Acqua"],
                        ["communityFeesIncluded", "Spese comunità"],
                      ] as [keyof TemporadaForm, string][]).map(([field, label]) => (
                        <div key={field} className="flex items-center gap-2">
                          <Checkbox
                            id={`mt_${field}`}
                            checked={!!form.rentalTypes.mediaTemporada[field]}
                            onCheckedChange={(v) => setMediaTemporada({ [field]: !!v })}
                          />
                          <Label htmlFor={`mt_${field}`} className="text-sm font-normal cursor-pointer">{label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Larga Temporada */}
            <div className="rounded-lg border overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setLargaTemporada({ enabled: !form.rentalTypes.largaTemporada.enabled })}
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={form.rentalTypes.largaTemporada.enabled}
                    onCheckedChange={(v) => setLargaTemporada({ enabled: v })}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div>
                    <p className="font-medium text-sm">Larga Temporada</p>
                    <p className="text-xs text-muted-foreground">Affitto a lungo termine, oltre 6 mesi</p>
                  </div>
                </div>
                {form.rentalTypes.largaTemporada.enabled && (
                  <Badge variant="secondary" className="text-xs">Attivo</Badge>
                )}
              </div>
              {form.rentalTypes.largaTemporada.enabled && (
                <div className="px-4 pb-4 pt-2 border-t bg-muted/10 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="lt_monthlyRate">Tariffa mensile (€)</Label>
                    <Input
                      id="lt_monthlyRate"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="600"
                      value={form.rentalTypes.largaTemporada.monthlyRate}
                      onChange={(e) => setLargaTemporada({ monthlyRate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Spese incluse</p>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        ["internetIncluded", "Internet"],
                        ["electricityIncluded", "Luce"],
                        ["waterIncluded", "Acqua"],
                        ["communityFeesIncluded", "Spese comunità"],
                      ] as [keyof TemporadaForm, string][]).map(([field, label]) => (
                        <div key={field} className="flex items-center gap-2">
                          <Checkbox
                            id={`lt_${field}`}
                            checked={!!form.rentalTypes.largaTemporada[field]}
                            onCheckedChange={(v) => setLargaTemporada({ [field]: !!v })}
                          />
                          <Label htmlFor={`lt_${field}`} className="text-sm font-normal cursor-pointer">{label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

          </CardContent>
        </Card>

        {/* Foto */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ImagePlus className="h-4 w-4" />
              Foto della proprietà
              {form.photos.length > 0 && (
                <Badge variant="secondary" className="ml-1">{form.photos.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />

            {isUploading && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Upload className="h-3.5 w-3.5 animate-pulse" />
                    Caricamento in corso…
                  </span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            )}

            {form.photos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {form.photos.map((url, idx) => (
                  <div key={url + idx} className="relative rounded-lg overflow-hidden border bg-muted aspect-video flex flex-col">
                    <img
                      src={url}
                      alt={`Foto ${idx + 1}`}
                      className="w-full flex-1 object-cover min-h-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='60' viewBox='0 0 100 60'%3E%3Crect width='100' height='60' fill='%23f1f5f9'/%3E%3Ctext x='50' y='35' text-anchor='middle' fill='%2394a3b8' font-size='10'%3EErrore%3C/text%3E%3C/svg%3E";
                      }}
                    />
                    {idx === 0 && (
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary text-white shadow">
                        Copertina
                      </span>
                    )}
                    <div className="flex items-center justify-between bg-background/95 border-t px-1 py-0.5 gap-0.5">
                      <div className="flex gap-0.5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => movePhoto(idx, -1)}
                          className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Sposta a sinistra"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === form.photos.length - 1}
                          onClick={() => movePhoto(idx, 1)}
                          className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Sposta a destra"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium flex-1 text-center">
                        {idx + 1}/{form.photos.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="p-1 rounded hover:bg-destructive/10 text-destructive"
                        title="Elimina foto"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 py-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="h-7 w-7 text-muted-foreground/60" />
              <span className="text-sm font-medium text-muted-foreground">
                Clicca per scegliere le foto
              </span>
              <span className="text-xs text-muted-foreground/70">
                JPG, PNG, WEBP — più file selezionabili contemporaneamente
              </span>
            </button>
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

        {/* Inline error banner */}
        {formError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 flex items-start gap-3 text-sm text-destructive">
            <span className="mt-0.5 text-base">⚠️</span>
            <div>
              <p className="font-semibold">Impossibile salvare</p>
              <p className="mt-0.5">{formError}</p>
            </div>
            <button
              type="button"
              className="ml-auto text-destructive/60 hover:text-destructive"
              onClick={() => setFormError(null)}
              aria-label="Chiudi"
            >
              ✕
            </button>
          </div>
        )}

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
