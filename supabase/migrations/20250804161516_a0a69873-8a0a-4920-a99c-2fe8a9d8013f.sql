-- Create storage bucket for testimonial photos
INSERT INTO storage.buckets (id, name, public) VALUES ('testimonials', 'testimonials', true);

-- Create policies for testimonial uploads
CREATE POLICY "Anyone can view testimonial images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'testimonials');

CREATE POLICY "Admins can upload testimonial images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'testimonials' AND is_admin(auth.uid()));

CREATE POLICY "Admins can update testimonial images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'testimonials' AND is_admin(auth.uid()));

CREATE POLICY "Admins can delete testimonial images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'testimonials' AND is_admin(auth.uid()));