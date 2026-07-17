import { useEffect, useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2, Film, Image, RotateCcw, Upload, Check, Facebook, MessageSquare, Twitter } from "lucide-react";
import { toast } from "sonner";

import { DashboardHeader } from "./dashboard-header";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function sanitizePhoneInput(value: string): string {
  const cleaned = value.replace(/[^\d+]/g, "");
  const maxLen = cleaned.startsWith("+") ? 13 : 11;
  return cleaned.slice(0, maxLen);
}

function normalizePhPhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");
  if (/^09\d{9}$/.test(digits)) return `+63${digits.slice(1)}`;
  if (/^639\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50MB

function fileExtFromType(file: File) {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return (file.type.split("/")[1] || "jpg").toLowerCase();
}

async function uploadFile(bucket: string, folder: string, file: File, isVideo: boolean = false) {
  const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024; // 50MB video, 5MB image
  if (isVideo) {
    if (!file.type.startsWith("video/")) throw new Error("Please choose a video file");
  } else {
    if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");
  }
  if (file.size > maxSize) {
    throw new Error(`${isVideo ? "Video" : "Image"} must be smaller than ${isVideo ? "50MB" : "5MB"}`);
  }

  const path = `${folder}/${crypto.randomUUID()}.${fileExtFromType(file)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export function SettingsPage() {
  const qc = useQueryClient();
  const { data: settings, error: queryError } = useQuery({
    queryKey: ["shop_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shop_settings").select("*").eq("id", 1).maybeSingle();
      if (error) {
        console.error("Settings query error:", error);
        throw error;
      }
      return data;
    },
  });
  const [s, setS] = useState<any>(null);
  useEffect(() => { 
    if (settings !== undefined && settings !== null) {
      setS(settings); 
    }
  }, [settings]);

  const [selectedBarber, setSelectedBarber] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: dbBarbers = [] } = useQuery({
    queryKey: ["admin_settings_barbers"],
    queryFn: async () => (await supabase.from("barbers").select("id, name").eq("is_active", true).order("name")).data ?? [],
  });

  const { data: dbServices = [] } = useQuery({
    queryKey: ["admin_settings_services"],
    queryFn: async () => (await supabase.from("services").select("id, name").eq("is_active", true).order("name")).data ?? [],
  });

  const generatedLink = useMemo(() => {
    const base = typeof window !== "undefined" ? window.location.origin : "http://localhost:8080";
    const params = new URLSearchParams();
    if (selectedBarber) params.set("barber", selectedBarber);
    if (selectedService) params.set("service", selectedService);
    const queryStr = params.toString();
    return `${base}/book${queryStr ? `?${queryStr}` : ""}`;
  }, [selectedBarber, selectedService]);

  const save = useMutation({
    mutationFn: async () => {
      const normalized = normalizePhPhone(s.shop_phone ?? "");
      if (s.shop_phone && !normalized) {
        throw new Error("Invalid phone number. Please use Philippine format (e.g. 09171234567 or +639171234567).");
      }
      const updatedSettings = {
        ...s,
        shop_phone: normalized || s.shop_phone,
      };
      const { error } = await supabase.from("shop_settings").update(updatedSettings).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Settings saved"); qc.invalidateQueries({ queryKey: ["shop_settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ["holidays"],
    queryFn: async () => (await supabase.from("holidays").select("*").order("holiday_date")).data ?? [],
  });
  const [hName, setHName] = useState(""); const [hDate, setHDate] = useState("");
  const addHoliday = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("holidays").insert({ name: hName, holiday_date: hDate });
      if (error) throw error;
    },
    onSuccess: () => { setHName(""); setHDate(""); qc.invalidateQueries({ queryKey: ["holidays"] }); toast.success("Holiday added"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const removeHoliday = useMutation({
    mutationFn: async (id: string) => { await supabase.from("holidays").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["holidays"] }),
  });

  if (queryError) {
    return (
      <div className="p-6 text-red-500 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900/30">
        <h3 className="font-bold font-mono text-sm uppercase">[ Error Loading Settings ]</h3>
        <p className="text-xs font-mono mt-2">{(queryError as any).message || String(queryError)}</p>
      </div>
    );
  }

  if (!s) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Settings"
        subtitle="Shop information and operating hours"
        actions={<Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}><Save className="mr-2 h-4 w-4" />Save</Button>}
      />

      <Card>
        <CardHeader><CardTitle>Shop info</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1.5 min-w-0"><Label>Shop name</Label><Input value={s.shop_name ?? ""} onChange={(e) => setS({ ...s, shop_name: e.target.value })} /></div>
          <div className="space-y-1.5 min-w-0"><Label>Email</Label><Input value={s.shop_email ?? ""} onChange={(e) => setS({ ...s, shop_email: e.target.value })} /></div>
          <div className="space-y-1.5 min-w-0">
            <Label>Phone</Label>
            <Input
              value={s.shop_phone ?? ""}
              onChange={(e) => setS({ ...s, shop_phone: sanitizePhoneInput(e.target.value) })}
              placeholder="09171234567"
              maxLength={13}
            />
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Philippine format, e.g. 09171234567 or +639171234567
            </p>
          </div>
          <div className="space-y-1.5 min-w-0"><Label>Address</Label><Input value={s.shop_address ?? ""} onChange={(e) => setS({ ...s, shop_address: e.target.value })} /></div>
          <div className="space-y-1.5 min-w-0"><Label>Opening time</Label><Input type="time" value={s.open_time?.slice(0,5) ?? ""} onChange={(e) => setS({ ...s, open_time: e.target.value })} /></div>
          <div className="space-y-1.5 min-w-0"><Label>Closing time</Label><Input type="time" value={s.close_time?.slice(0,5) ?? ""} onChange={(e) => setS({ ...s, close_time: e.target.value })} /></div>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle>Social media links</CardTitle>
          <CardDescription>Shown as icons in the site footer. Leave any field blank to hide it.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1.5 min-w-0"><Label>Facebook URL</Label><Input value={s.facebook_url ?? ""} onChange={(e) => setS({ ...s, facebook_url: e.target.value })} placeholder="https://facebook.com/..." /></div>
          <div className="space-y-1.5 min-w-0"><Label>Instagram URL</Label><Input value={s.instagram_url ?? ""} onChange={(e) => setS({ ...s, instagram_url: e.target.value })} placeholder="https://instagram.com/..." /></div>
          <div className="space-y-1.5 min-w-0"><Label>TikTok URL</Label><Input value={s.tiktok_url ?? ""} onChange={(e) => setS({ ...s, tiktok_url: e.target.value })} placeholder="https://tiktok.com/@..." /></div>
          <div className="space-y-1.5 min-w-0"><Label>X (Twitter) URL</Label><Input value={s.x_url ?? ""} onChange={(e) => setS({ ...s, x_url: e.target.value })} placeholder="https://x.com/..." /></div>
          <div className="space-y-1.5 min-w-0 md:col-span-2">
            <Label>Google Review URL (Redirect Funnel)</Label>
            <Input value={s.google_review_url ?? ""} onChange={(e) => setS({ ...s, google_review_url: e.target.value })} placeholder="https://g.page/r/.../review or https://search.google.com/local/writereview?placeid=..." />
            <p className="text-[11px] text-muted-foreground mt-0.5">
              If set, customers leaving 4 or 5-star reviews on the website will be prompted to also post on Google.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About Us Page Content</CardTitle>
          <CardDescription>Edit the hero banner, story text, and establishment year shown on the public About Us page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Hero Banner Title</Label>
              <Input
                value={s.about_hero_title ?? ""}
                onChange={(e) => setS({ ...s, about_hero_title: e.target.value })}
                placeholder="e.g. OUR STORY"
              />
              <p className="text-[11px] text-muted-foreground">The huge text display in the hero banner.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Hero Banner Subtitle</Label>
              <Input
                value={s.about_hero_subtitle ?? ""}
                onChange={(e) => setS({ ...s, about_hero_subtitle: e.target.value })}
                placeholder="Brief description under the hero title..."
              />
              <p className="text-[11px] text-muted-foreground">Introductory text shown next to the main title.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Section Heading</Label>
              <Input
                value={s.about_heading ?? ""}
                onChange={(e) => setS({ ...s, about_heading: e.target.value })}
                placeholder="e.g. BUILT ON THE SOUTHSIDE"
              />
              <p className="text-[11px] text-muted-foreground">The large heading above your story text. Displayed in uppercase.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Establishment Year</Label>
              <Input
                value={s.about_year ?? ""}
                onChange={(e) => setS({ ...s, about_year: e.target.value })}
                placeholder="e.g. 2024"
              />
              <p className="text-[11px] text-muted-foreground">Shown in the decorative "EST." block on the About page.</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>About Story / Body Text</Label>
            <textarea
              value={s.about_body ?? ""}
              onChange={(e) => setS({ ...s, about_body: e.target.value })}
              placeholder="Tell your story here... Separate paragraphs with a blank line."
              rows={8}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <p className="text-[11px] text-muted-foreground">Use blank lines between paragraphs. Each paragraph will be shown separately on the About page.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Homepage Assets</CardTitle>
          <CardDescription>
            Manage the images and videos displayed on the public landing page. Upload files to replace the default styling images.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Hero Slideshow Section */}
          <div className="space-y-3">
            <Label className="text-sm font-bold block">Hero Slideshow Carousel</Label>
            <p className="text-xs text-muted-foreground">
              Add or remove images from the main top slider. (Default slideshow is shown if none are uploaded).
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {(s.hero_slideshow || []).map((url: string, index: number) => (
                <div key={index} className="relative aspect-[16/9] group rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
                  <img src={url} alt={`Slide ${index + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8 rounded-full"
                      onClick={() => {
                        const nextSlides = s.hero_slideshow.filter((_: any, i: number) => i !== index);
                        setS({ ...s, hero_slideshow: nextSlides });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {/* Upload New Slide Button */}
              <div className="relative aspect-[16/9] border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors flex flex-col items-center justify-center cursor-pointer p-2 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      toast.loading("Uploading hero slide...", { id: "upload-hero" });
                      const url = await uploadFile("homepage-assets", "hero", file, false);
                      const currentSlides = s.hero_slideshow || [];
                      setS({ ...s, hero_slideshow: [...currentSlides, url] });
                      toast.success("Hero slide uploaded!", { id: "upload-hero" });
                    } catch (err: any) {
                      toast.error(err.message, { id: "upload-hero" });
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Plus className="h-5 w-5 text-muted-foreground mb-1" />
                <span className="text-[10px] font-medium text-muted-foreground">Add Slide</span>
              </div>
            </div>
          </div>

          <hr className="border-zinc-200 dark:border-zinc-800" />

          {/* Section Assets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* About Us Photo */}
            <div className="space-y-2">
              <Label className="text-sm font-bold block">About Us Photo</Label>
              <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
                {s.about_image_url ? (
                  <img src={s.about_image_url} alt="About Us" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <Image className="h-8 w-8 text-zinc-400 mx-auto mb-1" />
                    <span className="text-[10px] text-zinc-400 block font-mono">[ Default Photo ]</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        toast.loading("Uploading photo...", { id: "upload-about" });
                        const url = await uploadFile("homepage-assets", "about", file, false);
                        setS({ ...s, about_image_url: url });
                        toast.success("About photo updated!", { id: "upload-about" });
                      } catch (err: any) {
                        toast.error(err.message, { id: "upload-about" });
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                  />
                  <Button size="sm" variant="outline" className="w-full" type="button">
                    <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload File
                  </Button>
                </div>
                {s.about_image_url && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setS({ ...s, about_image_url: null })}
                    className="text-muted-foreground hover:text-destructive"
                    type="button"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                  </Button>
                )}
              </div>
            </div>

            {/* Popular Services Photo */}
            <div className="space-y-2">
              <Label className="text-sm font-bold block">Popular Services Photo</Label>
              <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
                {s.services_image_url ? (
                  <img src={s.services_image_url} alt="Services" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <Image className="h-8 w-8 text-zinc-400 mx-auto mb-1" />
                    <span className="text-[10px] text-zinc-400 block font-mono">[ Default Photo ]</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        toast.loading("Uploading photo...", { id: "upload-services" });
                        const url = await uploadFile("homepage-assets", "services", file, false);
                        setS({ ...s, services_image_url: url });
                        toast.success("Services photo updated!", { id: "upload-services" });
                      } catch (err: any) {
                        toast.error(err.message, { id: "upload-services" });
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                  />
                  <Button size="sm" variant="outline" className="w-full" type="button">
                    <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload File
                  </Button>
                </div>
                {s.services_image_url && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setS({ ...s, services_image_url: null })}
                    className="text-muted-foreground hover:text-destructive"
                    type="button"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                  </Button>
                )}
              </div>
            </div>

            {/* Our Mission Video */}
            <div className="space-y-2">
              <Label className="text-sm font-bold block">Our Mission Video (Replaces Photo)</Label>
              <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
                {s.mission_video_url ? (
                  <video src={s.mission_video_url} autoPlay muted loop className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <Film className="h-8 w-8 text-zinc-400 mx-auto mb-1" />
                    <span className="text-[10px] text-zinc-400 block font-mono">[ Default Photo ]</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        toast.loading("Uploading video (max 50MB)...", { id: "upload-video" });
                        const url = await uploadFile("homepage-assets", "mission-video", file, true);
                        setS({ ...s, mission_video_url: url });
                        toast.success("Mission video updated!", { id: "upload-video" });
                      } catch (err: any) {
                        toast.error(err.message, { id: "upload-video" });
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                  />
                  <Button size="sm" variant="outline" className="w-full" type="button">
                    <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload Video
                  </Button>
                </div>
                {s.mission_video_url && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setS({ ...s, mission_video_url: null })}
                    className="text-muted-foreground hover:text-destructive"
                    type="button"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                  </Button>
                )}
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Booking Link Builder &amp; Social Sharing</CardTitle>
          <CardDescription>
            Generate custom booking links with pre-selected services and barbers to share on social media.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Select Barber */}
            <div className="space-y-1.5">
              <Label>Pre-select Barber (Optional)</Label>
              <select
                value={selectedBarber}
                onChange={(e) => setSelectedBarber(e.target.value)}
                className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="">Any Barber</option>
                {dbBarbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Select Service */}
            <div className="space-y-1.5">
              <Label>Pre-select Service (Optional)</Label>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full h-10 px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="">Any Service</option>
                {dbServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Generated URL Box */}
          <div className="space-y-2 pt-2">
            <Label className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Generated Booking URL</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={generatedLink}
                className="font-mono text-xs bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 select-all"
              />
              <Button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(generatedLink);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                  toast.success("Link copied to clipboard!");
                }}
                className="shrink-0 bg-sky-500 hover:bg-sky-600 text-white font-bold"
              >
                {copied ? <Check className="h-4 w-4" /> : "Copy"}
              </Button>
            </div>
          </div>

          {/* Share on Social Media Buttons */}
          <div className="space-y-2 pt-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground block">Share booking page directly</Label>
            <div className="flex flex-wrap gap-3">
              {/* Facebook Share */}
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(generatedLink)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-[#1877F2] text-white rounded-lg text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-md"
              >
                <Facebook className="h-4 w-4" /> Facebook
              </a>

              {/* WhatsApp Share */}
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Book your appointment online! ${generatedLink}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-lg text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-md"
              >
                <MessageSquare className="h-4 w-4" /> WhatsApp
              </a>

              {/* X Share */}
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(generatedLink)}&text=${encodeURIComponent(`Book your next haircut online!`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-black text-white border border-zinc-800 rounded-lg text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-md"
              >
                <Twitter className="h-4 w-4" /> Share on X
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Holidays</CardTitle>
          <CardDescription>Days the shop is closed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <Input placeholder="Holiday name" value={hName} onChange={(e) => setHName(e.target.value)} className="flex-1 min-w-0" />
            <Input type="date" value={hDate} onChange={(e) => setHDate(e.target.value)} className="w-full md:w-[200px] shrink-0 min-w-0" />
            <Button onClick={() => addHoliday.mutate()} disabled={!hName || !hDate} className="w-full md:w-auto shrink-0"><Plus className="mr-2 h-4 w-4" />Add</Button>
          </div>
          <div className="space-y-2">
            {holidays.map((h) => (
              <div key={h.id} className="flex items-center justify-between rounded border p-2 text-sm">
                <span>{h.holiday_date} · {h.name}</span>
                <Button size="icon" variant="ghost" onClick={() => removeHoliday.mutate(h.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
