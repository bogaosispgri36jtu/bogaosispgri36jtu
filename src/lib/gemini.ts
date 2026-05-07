import { GoogleGenAI } from "@google/genai";

export async function extractAnswersFromImage(base64Image: string): Promise<Record<string, string | null>> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Kunci API Gemini (GEMINI_API_KEY) belum diatur. Silakan tambahkan Environment Variable di Vercel.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    // Remove the data url prefix (e.g. data:image/jpeg;base64,) if present
    const base64Data = base64Image.split(',')[1] || base64Image;
    const mimeType = base64Image.split(';')[0].split(':')[1] || 'image/jpeg';

    const prompt = `Anda adalah sistem pengoreksi otomatis Lembar Jawaban Komputer (LJK) yang sangat akurat.
Tugas Anda adalah membaca gambar LJK yang diberikan dan mengekstrak jawaban untuk soal Pilihan Ganda (nomor 1 sampai 50).
Pilihan ganda biasanya terdiri dari opsi A, B, C, D. Deteksi bulatan yang paling penuh atau hitam untuk setiap nomor.
Jika bulatan tidak jelas, atau ada lebih dari satu bulatan, atau tidak terisi, kembalikan null untuk nomor tersebut.

SANGAT PENTING: Anda HANYA boleh mengembalikan nilai dengan format JSON objek yang valid. Jangan tambahkan teks markdown seperti \`\`\`json.
Format harus persis seperti ini:
{
  "1": "A",
  "2": "C",
  "3": null,
  ... (sampai 50)
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Data,
                mimeType,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || "{}";
    // Just in case it returned markdown despite config, try parsing
    let parsed: Record<string, string | null> = {};
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      // rough cleanup if needed
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }
    
    return parsed;
  } catch (error) {
    console.error("Error extracting answers:", error);
    throw new Error("Gagal memproses gambar. Pastikan gambar jelas dan coba lagi.");
  }
}
