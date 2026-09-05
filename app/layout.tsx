import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Site Saathi · Your people. Your sites.',description:'Photo-first attendance, wages, payments and site reports for your construction team.',manifest:'/manifest.webmanifest',icons:{icon:'/favicon.svg',apple:'/icon-192.png'},appleWebApp:{capable:true,title:'Site Saathi',statusBarStyle:'default'}};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#142a3e'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
