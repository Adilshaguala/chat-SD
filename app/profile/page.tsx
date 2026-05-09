"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateProfile, uploadAvatar } from "@/app/actions/profile";
import { Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft, Upload, LogOut } from "lucide-react";
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
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/auth/login");
          return;
        }

        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("[v0] Error fetching profile:", error);
          toast.error("Erro ao carregar perfil");
          return;
        }

        if (profileData) {
          setProfile(profileData);
          setName(profileData.name);
          setAvatarPreview(profileData.avatar_url);
        }
      } catch (error) {
        console.error("[v0] Error in fetchProfile:", error);
        toast.error("Erro ao carregar perfil");
      } finally {
        setIsLoading(false);
      }
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

  const validateForm = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError("Nome é obrigatório");
      return false;
    }
    if (trimmedName.length < 2) {
      setNameError("Nome deve ter pelo menos 2 caracteres");
      return false;
    }
    setNameError("");
    return true;
  };

  const handleSave = async () => {
    if (!validateForm() || !profile) return;

    setIsSaving(true);
    try {
      let avatarUrl = profile.avatar_url;

      // Upload avatar if changed
      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        const result = await uploadAvatar(formData);
        avatarUrl = result.url;
      }

      // Update profile
      await updateProfile(name.trim(), avatarUrl);

      setProfile({
        ...profile,
        name: name.trim(),
        avatar_url: avatarUrl,
      });
      setAvatarFile(null);
      toast.success("Perfil atualizado com sucesso!");
    } catch (error) {
      console.error("[v0] Error updating profile:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao atualizar perfil. Tente novamente."
      );
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
      toast.success("Desconectado com sucesso!");
    } catch (error) {
      console.error("[v0] Error signing out:", error);
      toast.error("Erro ao desconectar");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setName(profile.name);
      setAvatarFile(null);
      setAvatarPreview(profile.avatar_url);
      setNameError("");
    }
    router.back();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Erro</CardTitle>
            <CardDescription>Não foi possível carregar seu perfil</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/chat")} className="w-full">
              Voltar ao Chat
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Perfil</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie suas informações pessoais
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Avatar Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Foto de Perfil</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarPreview || undefined} />
                <AvatarFallback className="bg-primary/20 text-lg font-semibold">
                  {profile.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="w-full">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <Button variant="outline" className="w-full" asChild>
                    <span className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Alterar Foto
                    </span>
                  </Button>
                </label>
              </div>

              {avatarFile && (
                <p className="text-sm text-muted-foreground">
                  {avatarFile.name}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Pessoais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Name Field */}
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Nome
                </label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError("");
                  }}
                  placeholder="Digite seu nome"
                  disabled={isSaving}
                  className={nameError ? "border-red-500" : ""}
                />
                {nameError && (
                  <p className="text-sm text-red-500">{nameError}</p>
                )}
              </div>

              {/* Email Field (Read-only) */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  className="bg-muted"
                />
              </div>

              {/* Joined Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Membro desde
                </label>
                <p className="text-sm text-muted-foreground">
                  {new Date(profile.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>

              {/* Online Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <div className="flex items-center gap-2">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      profile.is_online ? "bg-green-500" : "bg-gray-400"
                    }`}
                  />
                  <p className="text-sm text-muted-foreground">
                    {profile.is_online ? "Online" : "Offline"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={isSaving || isLoggingOut}
              className="flex-1"
            >
              {isSaving ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving || isLoggingOut}
              className="flex-1"
            >
              Cancelar
            </Button>

            <Button
              variant="destructive"
              onClick={handleLogout}
              disabled={isSaving || isLoggingOut}
              size="icon"
              title="Desconectar"
            >
              {isLoggingOut ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
