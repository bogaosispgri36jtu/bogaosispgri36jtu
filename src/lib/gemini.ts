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

    const prompt = `Anda adalah sistem pengoreksi otomatis Lembar Jawaban Komputer (LJK) tingkat presisi tinggi.
Tugas Anda adalah membaca KERTAS LEMBAR JAWABAN (LJK) yang diunggah dan mengekstrak LENGKAP SEMUA jawaban siswa untuk soal Pilihan Ganda (nomor 1 sampai dengan 50).

Instruksi Detail & Layout Kertas:
1. Perhatikan baik-baik layout kertas tersebut. Terdapat tabel "PILIHAN GANDA" di bagian tengah bawah.
2. Terdapat tepat 5 kolom nomor, dengan masing-masing kolom berisi 10 nomor berurutan ke bawah:
   - Kolom 1: Nomor 1 sampai 10
   - Kolom 2: Nomor 11 sampai 20
   - Kolom 3: Nomor 21 sampai 30
   - Kolom 4: Nomor 31 sampai 40
   - Kolom 5: Nomor 41 sampai 50
3. Di sebelah kanan setiap nomor terdapat 4 bulatan berhuruf A, B, C, dan D.
4. Periksa SETIAP NOMOR satu per satu. Lihat manakah bulatan (A, B, C, atau D) yang paling hitam atau diarsir tebal oleh siswa.
5. Jika siswa mengarsir bulatan A, kembalikan "A". Jika B, kembalikan "B". Jika C, kembalikan "C". Jika D, kembalikan "D".
6. Jika tidak ada bulatan yang diarsir, atau ada lebih dari satu yang diarsir tebal sehingga ambigu, kembalikan null.

PENTING: Jangan melewatkan satu nomor pun. Baca secara berurutan sesuai kolom.
HANYA kembalikan JSON Object murni yang berisi mapping key (string "1" s/d "50") ke value ("A", "B", "C", "D", atau null).`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
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
  } catch (error: any) {
    console.error("Error extracting answers:", error);
    const msg = error?.message || "";
    if (msg.includes("429") || msg.includes("Quota exceeded")) {
        throw new Error("Batas penggunaan gratis API Gemini Anda telah habis atau terlalu banyak permintaan dalam waktu singkat. Silakan coba lagi nanti.");
    }
    if (msg.includes("503") || msg.includes("high demand") || msg.includes("UNAVAILABLE")) {
        throw new Error("Sistem AI sedang sibuk (banyak pengguna). Silakan coba lagi dalam beberapa detik.");
    }
    throw new Error(`Gagal memproses gambar. Detail: ${msg || "Kesalahan tidak diketahui"} Coba pastikan gambar lebih jelas.`);
  }
}
