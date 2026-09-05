import { requireChatGPTUser } from './chatgpt-auth';
import ContractorApp from './contractor-app';
export const dynamic = 'force-dynamic';
export default async function Home(){await requireChatGPTUser('/');return <ContractorApp/>;}
