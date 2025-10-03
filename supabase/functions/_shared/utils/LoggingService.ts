// supabase/functions/_shared/utils/LoggingService.ts
import { getSupabaseAdmin } from "../supabase-admin.ts";

export class LoggingService {
  private transactionId: string;
  private userId: string;

  constructor(transactionId: string, userId: string) {
    this.transactionId = transactionId;
    this.userId = userId;
  }

  private async log(
    level: "INFO" | "WARN" | "ERROR" | "DEBUG",
    sourceFunction: string,
    message: string,
    metadata?: object,
  ) {
    try {
      const adminClient = getSupabaseAdmin();
      const { error } = await adminClient.from("app_logs").insert({
        transaction_id: this.transactionId,
        user_id: this.userId,
        log_level: level,
        source_function: sourceFunction,
        message: message,
        metadata: metadata || null,
      });
      if (error) {
        console.error("!!! CRITICAL LOGGING FAILURE !!!", error);
      }
    } catch (e) {
      console.error("!!! CATASTROPHIC LOGGING FAILURE !!!", e);
    }
  }

  public info(sourceFunction: string, message: string, metadata?: object) {
    console.log(`[INFO][${this.transactionId}] ${sourceFunction}: ${message}`);
    this.log("INFO", sourceFunction, message, metadata);
  }

  public warn(sourceFunction: string, message: string, metadata?: object) {
    console.warn(`[WARN][${this.transactionId}] ${sourceFunction}: ${message}`);
    this.log("WARN", sourceFunction, message, metadata);
  }

  public error(
    sourceFunction: string,
    message: string,
    error: unknown,
    metadata?: object,
  ) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `[ERROR][${this.transactionId}] ${sourceFunction}: ${message}`,
      error,
    );
    this.log("ERROR", sourceFunction, `${message} - Error: ${errorMessage}`, {
      ...metadata,
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  public debug(sourceFunction: string, message: string, metadata?: object) {
    console.debug(
      `[DEBUG][${this.transactionId}] ${sourceFunction}: ${message}`,
    );
    this.log("DEBUG", sourceFunction, message, metadata);
  }
}
