// data/therapists.types.ts

import type { Ionicons } from "@expo/vector-icons";

// Bu, React Native'e özel bir tiptir ve sadece burada yaşayacak.
export type IconName = React.ComponentProps<typeof Ionicons>["name"];

// Bu, tüm projede kullanacağımız temel veri yapısının arayüzüdür.
export interface TherapistCoreData {
    id: string;
    name: string;
    thumbnailPath: string;
    photoPath: string;
    title: string;
    persona: string;
    personaKey: string;
    icon: IconName; // Tipi buradan alıyor
    style: string;
    specialties: string[];
    philosophy: string;
    about: string;
    approach: string;
    methods: string[];
}
