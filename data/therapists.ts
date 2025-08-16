// data/therapists.ts

import { ALL_THERAPISTS_DATA } from "./therapists.data";
import { TherapistCoreData } from "./therapists.types";

// Bu, UI'ın kullanacağı nihai tiptir. Dinamik import sonucunu içerir.
export interface TherapistDisplayData
  extends Omit<TherapistCoreData, "thumbnailPath" | "photoPath"> {
  thumbnail: string;
  photo: string;
}

// Saf veriyi (therapists.data.ts'den gelen) UI'ın kullanabileceği formata dönüştür.
export const ALL_THERAPISTS: TherapistDisplayData[] = ALL_THERAPISTS_DATA.map(
  ({ thumbnailPath, photoPath, ...rest }) => ({
    ...rest,
    thumbnail: thumbnailPath,
    photo: photoPath,
  }),
);

// getTherapistById fonksiyonu, artık UI için zenginleştirilmiş veriyi döndürür.
export const getTherapistById = (
  id: string,
): TherapistDisplayData | undefined => {
  return ALL_THERAPISTS.find((therapist) => therapist.id === id);
};
