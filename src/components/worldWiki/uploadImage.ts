export async function uploadWorldWikiImage(
  authApiBaseUrl: string,
  file: Blob,
  fileName = "cropped.png",
): Promise<string | null> {
  const formData = new FormData();
  formData.append("image", file, fileName);

  const response = await fetch(`${authApiBaseUrl}/api/admin/world-wiki/images`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Failed to upload image.");
  }

  return payload.image?.url || null;
}
