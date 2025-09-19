// components/ReportModal.tsx
import React, { useEffect } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Markdown from "react-native-markdown-display"; // SIHIRLI PARÇA
import Modal from "react-native-modal"; // react-native'in değil, bu kütüphanenin modalı
import { useTranslation } from "react-i18next";
import { Colors } from "../constants/Colors"; // Renklerini import et
import { markReportAsRead, UserReport } from "../services/report.service";

interface Props {
    isVisible: boolean;
    onClose: () => void;
    report: UserReport;
}

const ReportModal = ({ isVisible, onClose, report }: Props) => {
    const { t } = useTranslation();

    // === DOĞRU YÖNTEM: YAN ETKİ YÖNETİMİ ===
    // Modalın "görünür" olması durumuna (state) bir yan etki (side effect) bağlıyoruz.
    // Kullanıcının ne yaptığı (butona mı bastı, aşağı mı kaydırdı) umrumuzda değil.
    // Modal göründüğü an, rapor okunmuş demektir. Bitti.
    useEffect(() => {
        if (isVisible && report.id) {
            markReportAsRead(report.id);
        }
    }, [isVisible, report.id]);

    return (
        <Modal
            isVisible={isVisible}
            onBackButtonPress={onClose} // Android geri tuşu
            onBackdropPress={onClose} // Modal dışına tıklama
            onSwipeComplete={onClose} // Aşağı kaydırarak kapatma
            swipeDirection="down" // Aşağı kaydırmayı etkinleştir
            style={styles.modal}
            animationIn="slideInUp"
            animationOut="slideOutDown"
            backdropOpacity={0.6}
        >
            <View style={styles.container}>
                {/* Tutma Çubuğu */}
                <View style={styles.handleBar} />

                {/* Başlık */}
                <View style={styles.header}>
                    <Text style={styles.title}>
                        {report.report_title || t('home.report_modal.default_title')}
                    </Text>
                </View>

                {/* İçerik: MARKDOWN GÖSTERİCİSİ */}
                <ScrollView
                    style={styles.contentScrollView}
                    showsVerticalScrollIndicator={false}
                >
                    <Markdown style={markdownStyles}>
                        {report.report_content_markdown}
                    </Markdown>
                </ScrollView>

                {/* Kapatma Butonu */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}
                    >
                        <Text style={styles.closeButtonText}>{t('home.report_modal.close_button')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

// --- STİLLER: Prod-Ready ve Zarif ---
const styles = StyleSheet.create({
    modal: {
        justifyContent: "flex-end",
        margin: 0,
    },
    container: {
        backgroundColor: "#f7f8fa", // Hafif kirli beyaz
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: "85%",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
    },
    handleBar: {
        width: 40,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: "#dce1e7",
        alignSelf: "center",
        marginTop: 10,
        marginBottom: 10,
    },
    header: {
        paddingBottom: 15,
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#1a202c",
        textAlign: "center",
    },
    contentScrollView: {
        flex: 1,
        paddingHorizontal: 25,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: "#e2e8f0",
    },
    closeButton: {
        backgroundColor: Colors.light.tint, // Ana renk
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: "center",
    },
    closeButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "bold",
    },
});

// Markdown stilleri: Burayı kendi zevkine göre ayarla.
const markdownStyles = StyleSheet.create({
    heading2: { // ## Başlık
        fontSize: 20,
        fontWeight: "700",
        color: "#2d3748",
        borderBottomWidth: 1,
        borderColor: "#e2e8f0",
        paddingBottom: 8,
        marginBottom: 16,
        marginTop: 24,
    },
    heading3: { // ### Başlık
        fontSize: 18,
        fontWeight: "600",
        color: "#4a5568",
        marginTop: 20,
        marginBottom: 8,
    },
    body: { // Normal metin
        fontSize: 17,
        lineHeight: 28,
        color: "#4a5568",
    },
    list_item: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 12,
        marginLeft: 10,
    },
    bullet_list_icon: {
        color: Colors.light.tint,
        marginRight: 10,
        fontSize: 18,
        lineHeight: 28,
    },
});

export default ReportModal;
