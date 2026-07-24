'use client'

import Navbar from '@/components/inmobiliaria/Navbar'
import Hero from '@/components/inmobiliaria/Hero'
import FeaturedProperties from '@/components/inmobiliaria/FeaturedProperties'
import PropertyCategories from '@/components/inmobiliaria/PropertyCategories'
import Tasacion from '@/components/inmobiliaria/Tasacion'
import AboutUs from '@/components/inmobiliaria/AboutUs'
import Services from '@/components/inmobiliaria/Services'
import CTABanner from '@/components/inmobiliaria/CTABanner'
import Testimonials from '@/components/inmobiliaria/Testimonials'
import Blog from '@/components/inmobiliaria/Blog'
import Contact from '@/components/inmobiliaria/Contact'
import Footer from '@/components/inmobiliaria/Footer'
import WhatsAppButton from '@/components/inmobiliaria/WhatsAppButton'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <FeaturedProperties />
        <PropertyCategories />
        <CTABanner />
        <Tasacion />
        <AboutUs />
        <Services />
        <Testimonials />
        <Blog />
        <Contact />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  )
}
