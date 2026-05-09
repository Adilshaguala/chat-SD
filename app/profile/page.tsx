"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup, Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft, Upload, User, Mail, LogOut } from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [name, setName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string }>({});

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setName(profileData.name);
        setAvatarPreview(profileData.avatar_url);
      }
      setIsLoading(false);
    };

    fetchProfile();
  }, [router]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Por favor, selecione uma imagem válida");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error("Imagem deve ser menor que 5MB");
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validate = () => {
    const newErrors: typeof errors = {};

    if (!name.trim()) {
      newErrors.name = "Nome é obrigatório";
    } else if (name.length < 2) {
      newErrors.name = "Nome deve ter pelo menos 2 caracteres";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !profile) return;

    setIsSaving(true);
    const supabase = createClient();

    try {
      let avatarUrl = profile.avatar_url;

      // Upload avatar if changed
      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop();
        const filePath = `avatars/${profile.id}.${fileExt}`;

        // Delete old avatar if exists
        if (profile.avatar_url) {
          const oldPath = profile.avatar_url.split("/").pop();
          if (oldPath) {
            await supabase.storage.from("avatars").remove([`avatars/${oldPath}`]);
          }
        }

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
        avatarUrl = data.publicUrl;
      }

      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({
          name: name.trim(),
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile({
        ...profile,
        name: name.trim(),
        avatar_url: avatarUrl,
      });
      setAvatarFile(null);
      toast.success("Perfil atualizado com sucesso!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Erro ao atualizar perfil. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/auth/login");
    } catch (error) {
      toast.error("Erro ao fazer logout");
      setIsLoggingOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Voltar</span>
          </Button>
          <h1 className="text-3xl font-bold">Meu Perfil</h1>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>Atualize suas informações de perfil</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarPreview || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                  {name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <label className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Alterar foto
                  </span>
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-muted-foreground">
                Máximo 5MB. Formatos: JPG, PNG, GIF
              </p>
            </div>

            {/* Form Fields */}
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Nome</FieldLabel>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9"
                    disabled={isSaving}
                  />
                </div>
                {errors.name && <FieldError>{errors.name}</FieldError>}
              </Field>

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    className="pl-9"
                    disabled
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Email não pode ser alterado
                </p>
              </Field>
            </FieldGroup>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={isSaving || name === profile.name}
              className="w-full"
            >
              {isSaving ? (
                <>
                  <Spinner className="mr-2" />
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Logout Card */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Sair</CardTitle>
            <CardDescription>Encerre sua sessão na aplicação</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleLogout}
              disabled={isLoggingOut}
              variant="destructive"
              className="w-full"
            >
              {isLoggingOut ? (
                <>
                  <Spinner className="mr-2" />
                  Saindo...
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair da Conta
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
