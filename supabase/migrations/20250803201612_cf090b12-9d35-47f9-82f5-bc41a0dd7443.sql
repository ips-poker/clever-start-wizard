-- Update broken image URLs in cms_content table (testimonials)
UPDATE cms_content 
SET content_value = CASE 
  WHEN content_value = '/src/assets/gallery/poker-chips.jpg' THEN 'https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=800&h=600&fit=crop'
  WHEN content_value = '/src/assets/gallery/registration.jpg' THEN 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&h=600&fit=crop'
  WHEN content_value = '/src/assets/gallery/masterclass.jpg' THEN 'https://images.unsplash.com/photo-1542829257-5b7bb9b6e08b?w=800&h=600&fit=crop'
  WHEN content_value = '/src/assets/gallery/team-tournament.jpg' THEN 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop'
  ELSE content_value
END
WHERE content_type = 'image' 
AND content_value LIKE '/src/assets/gallery/%';

-- Update broken image URLs in cms_gallery table
UPDATE cms_gallery 
SET image_url = CASE 
  WHEN image_url = '/src/assets/gallery/tournament-table.jpg' THEN 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop'
  WHEN image_url = '/src/assets/gallery/vip-zone.jpg' THEN 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=600&fit=crop'
  WHEN image_url = '/src/assets/gallery/main-poker-room.jpg' THEN 'https://images.unsplash.com/photo-1542829257-5b7bb9b6e08b?w=800&h=600&fit=crop'
  WHEN image_url = '/src/assets/gallery/lounge-area.jpg' THEN 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop'
  WHEN image_url = '/src/assets/gallery/awards-ceremony.jpg' THEN 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&h=600&fit=crop'
  WHEN image_url = '/src/assets/gallery/poker-chips.jpg' THEN 'https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=800&h=600&fit=crop'
  WHEN image_url = '/src/assets/gallery/registration.jpg' THEN 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&h=600&fit=crop'
  WHEN image_url = '/src/assets/gallery/masterclass.jpg' THEN 'https://images.unsplash.com/photo-1542829257-5b7bb9b6e08b?w=800&h=600&fit=crop'
  WHEN image_url = '/src/assets/gallery/team-tournament.jpg' THEN 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop'
  ELSE image_url
END
WHERE image_url LIKE '/src/assets/gallery/%';