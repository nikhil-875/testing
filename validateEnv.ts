import { cleanEnv, num, str } from "envalid";
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export default cleanEnv(process.env, {
    PORT: num(),
    TOKEN: str(),
    VERIFY_TOKEN: str(),
    PASSPHRASE:str(),
    PRIVATE_KEY:str(),
    VERSION: str(),
    PHONE_NO_ID: str(),
    DB_USER: str(),
    DB_HOST: str(),
    DB_DATABASE: str(),
    DB_PASSWORD: str(),
    DB_PORT: num(),
    TOKEN_CLIENT_SECRET: str(),
    WHATSAPP_LOGIN_API_KEY: str(),
    MISTRAL_API_KEY: str()
});
