import { NavigationBar } from "../components/NavigationBar";
import { useState } from "react";

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate form submission
    setTimeout(() => {
      setSubmitted(true);
      setLoading(false);
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
      
      // Reset success message after 5 seconds
      setTimeout(() => setSubmitted(false), 5000);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5]">
      <NavigationBar />

      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-[#37352F] mb-4">
            Get In Touch
          </h1>
          <p className="text-lg text-[#787774] max-w-2xl mx-auto">
            Have questions about our garage management platform? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>

        {/* Contact Form Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Form */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl border border-[#E0E0E0] shadow-sm p-8">
              {submitted && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800">
                    ✓ Thank you! Your message has been sent successfully.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Name */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-[#37352F] mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg text-[#37352F] bg-white placeholder-[#BFBFBC] focus:border-[#37352F] focus:ring-1 focus:ring-[#37352F] transition-all outline-none"
                      placeholder="John Doe"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-[#37352F] mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg text-[#37352F] bg-white placeholder-[#BFBFBC] focus:border-[#37352F] focus:ring-1 focus:ring-[#37352F] transition-all outline-none"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-[#37352F] mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg text-[#37352F] bg-white placeholder-[#BFBFBC] focus:border-[#37352F] focus:ring-1 focus:ring-[#37352F] transition-all outline-none"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                {/* Subject */}
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-[#37352F] mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg text-[#37352F] bg-white placeholder-[#BFBFBC] focus:border-[#37352F] focus:ring-1 focus:ring-[#37352F] transition-all outline-none"
                    placeholder="How can we help?"
                  />
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-[#37352F] mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full px-4 py-2 border border-[#E0E0E0] rounded-lg text-[#37352F] bg-white placeholder-[#BFBFBC] focus:border-[#37352F] focus:ring-1 focus:ring-[#37352F] transition-all outline-none resize-none"
                    placeholder="Tell us more about your inquiry..."
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-6 bg-[#37352F] hover:bg-[#474540] text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Sending..." : "Send Message"}
                </button>
              </form>
            </div>
          </div>

          {/* Contact Info Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-[#E0E0E0] shadow-sm p-6">
              <h3 className="text-lg font-semibold text-[#37352F] mb-4">Contact Information</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-[#787774] mb-1">Email</p>
                  <p className="text-sm font-medium text-[#37352F]">
                    <a href="mailto:info@garagecrm.com" className="hover:text-blue-600 transition-colors">
                      info@garagecrm.com
                    </a>
                  </p>
                </div>

                <div>
                  <p className="text-sm text-[#787774] mb-1">Phone</p>
                  <p className="text-sm font-medium text-[#37352F]">
                    <a href="tel:+1-555-0000" className="hover:text-blue-600 transition-colors">
                      +1 (555) 000-0000
                    </a>
                  </p>
                </div>

                <div>
                  <p className="text-sm text-[#787774] mb-1">Address</p>
                  <p className="text-sm font-medium text-[#37352F]">
                    123 Garage Street<br />
                    Auto City, AC 12345<br />
                    United States
                  </p>
                </div>

                <div>
                  <p className="text-sm text-[#787774] mb-1">Hours</p>
                  <p className="text-sm font-medium text-[#37352F]">
                    Monday - Friday: 9:00 AM - 6:00 PM<br />
                    Saturday: 10:00 AM - 4:00 PM<br />
                    Sunday: Closed
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#F7F6F3] rounded-xl border border-[#E0E0E0] p-6">
              <h3 className="text-lg font-semibold text-[#37352F] mb-2">Response Time</h3>
              <p className="text-sm text-[#787774]">
                We typically respond to inquiries within 24 business hours. For urgent matters, please call us directly.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
