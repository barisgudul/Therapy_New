// supabase/functions/_shared/utils/LoggingService.ts
import { supabase as adminClient } from "../supabase-admin.ts";

export class LoggingService {
  private transactionId: string;
  private userId: string;

  constructor(transactionId: string, userId: string) {
    this.transactionId = transactionId;
    this.userId = userId;
  }

  private async log(
    level: "INFO" | "WARN" | "ERROR",
    functionName: string,
    message: string,
    payload?: object,
  ) {
    try {
      const { error } = await adminClient.from("system_logs").insert({
        transaction_id: this.transactionId,
        user_id: this.userId,
        function_name: functionName,
        log_level: level,
        message: message,
        payload: payload || null,
      });
      if (error) {
        console.error("!!! CRITICAL LOGGING FAILURE !!!", error);
      }
    } catch (e) {
      console.error("!!! CATASTROPHIC LOGGING FAILURE !!!", e);
    }
  }

  public info(functionName: string, message: string, payload?: object) {
    console.log(`[INFO][${this.transactionId}] ${functionName}: ${message}`);
    this.log("INFO", functionName, message, payload);
  }

  public warn(functionName: string, message: string, payload?: object) {
    console.warn(`[WARN][${this.transactionId}] ${functionName}: ${message}`);
    this.log("WARN", functionName, message, payload);
  }

  public error(
    functionName: string,
    message: string,
    error: unknown,
    payload?: object,
  ) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `[ERROR][${this.transactionId}] ${functionName}: ${message}`,
      error,
    );
    this.log("ERROR", functionName, `${message} - Error: ${errorMessage}`, {
      ...payload,
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
