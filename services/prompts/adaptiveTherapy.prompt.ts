// services/prompts/adaptiveTherapy.prompt.ts
import { Traits } from "../../services/trait.service.ts";
import { VaultData } from "../../services/vault.service.ts";

type TherapistPersonality = string;

export const getAdaptiveTherapistReplyPrompt = (
    personality: TherapistPersonality,
    therapistName: string,
    userMessage: string,
    contextLevel: "minimal" | "medium" | "full",
    userVault: VaultData | null,
    limitedChatHistory: string,
    journeyLogContext: string,
): string => {
    const personalityDescriptions: Record<TherapistPersonality, string> = {
        default:
            "Sen empatik ve destekleyici bir terapistsin. Amacın güvenli bir alan yaratmak.",
        calm:
            "Sen sakinleştirici ve güven verici bir terapistsin. Topraklanma ve güvenlik hissi üzerine odaklanıyorsun.",
        motivational:
            "Sen motivasyonel ve cesaretlendirici bir koçsun. Kullanıcının iç gücünü ve potansiyelini ortaya çıkarmasına yardım ediyorsun.",
        analytical:
            "Sen analitik ve derinlemesine düşünen bir terapistsin. Olaylar arasındaki gizli bağlantıları ve davranış kalıplarını ortaya çıkarıyorsun.",
    };
    const selectedPersonalityDescription =
        personalityDescriptions[personality] || personalityDescriptions.default;

    if (contextLevel === "minimal") {
        const userName = userVault?.profile?.nickname;
        return `Senin rolün: ${selectedPersonalityDescription}. Adın ${therapistName}. Kullanıcının adı ${
            userName || "yok"
        }. Sana "${userMessage}" dedi. Sıcak bir karşılama yap (1-2 cümle).`
            .trim();
    } else if (contextLevel === "medium") {
        const currentMood = userVault?.currentMood || "";
        const themes = userVault?.themes?.slice(0, 2).join(", ") || "";
        return `Rolün: ${selectedPersonalityDescription}. Adın ${therapistName}.
Bağlam: Ruh hali ${currentMood}. Ana konular: ${themes}.
Konuşma:
${limitedChatHistory}
Son mesaj: "${userMessage}"
Görevin: Rolüne uygun, anlayışlı bir yanıt ver (2-3 cümle).`.trim();
    } else { // contextLevel === 'full'
        const currentMood = userVault?.currentMood || "belirsiz";
        const themes = userVault?.themes?.slice(0, 3).join(", ") || "belirsiz";
        let traitsSummary = "";
        if (userVault?.traits) {
            const traits = userVault.traits as Partial<Traits>;
            const summaries: string[] = [];
            if (typeof traits.confidence === "number") {
                summaries.push(
                    `güven seviyesi %${(traits.confidence * 100).toFixed(0)}`,
                );
            }
            if (typeof traits.anxiety_level === "number") {
                summaries.push(
                    `kaygı seviyesi %${
                        (traits.anxiety_level * 100).toFixed(0)
                    }`,
                );
            }
            if (summaries.length > 0) {
                traitsSummary = `Kişilik özelliklerinden bazıları: ${
                    summaries.join(", ")
                }.`;
            }
        }
        return `Sen ${selectedPersonalityDescription} rolünde bir terapistsin. Adın ${therapistName}. Danışanınla bir süredir devam eden bir görüşme yapıyorsun.

Danışanın hakkında bildiklerin şunlar: Ruh hali genelde ${currentMood}. Üzerinde durduğunuz ana konular ${themes}. ${traitsSummary} ${journeyLogContext}

Aşağıda sohbetinizin son kısmı var:
${limitedChatHistory}

Danışanının son söylediği şey bu: "${userMessage}"

Tüm bu bütüncül bakış açısıyla, onu anladığını hissettiren, rolüne uygun, derin ve sezgisel bir yanıt ver. Yanıtın 2-3 cümle olsun.`
            .trim();
    }
};
