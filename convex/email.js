import { action } from "./_generated/server";
import {Resend} from "resend";
import { v } from "convex/values";

export const sendEmail = action({
    args: {
        to: v.string(),
        subject: v.string(),
        html: v.string(),
        apiKey: v.string(),
    },

    handler: async (ctx, args) => {
        if (!args.apiKey) {
            console.error("[email] Missing RESEND_API_KEY");
            return { success: false, error: "Missing API key" };
        }
        const resend = new Resend(args.apiKey);

        try {
            const res = await resend.emails.send({
            from: 'Spliq <onboarding@resend.dev>',
            to: args.to,
            subject: args.subject,
            html: args.html,
        });

        if (!res?.id) {
            console.error("[email] Invalid response from Resend:", res);
            return { 
                success: false, 
                error: "Invalid response from Resend",
                response: res,
                to: args.to,
                timestamp: new Date().toISOString()
            };
        }
        
        console.log("[email] sent successfully to:", args.to, "id:", res.id);
        return { 
                success: true, 
                id: res.id,
                to: args.to,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
           console.log(error);
           return {success: false, error: error.message} 
        }
    }
})