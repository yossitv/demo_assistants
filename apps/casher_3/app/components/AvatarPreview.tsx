"use client";
import styles from "../styles.module.css";

interface AvatarPreviewProps {
  imageSrc?: string;
  alt?: string;
}

export function AvatarPreview({ 
  imageSrc = "/avatar/ami-preview.png", 
  alt = "AI Avatar" 
}: AvatarPreviewProps) {
  return (
    <div className={styles.avatarPreviewContainer}>
      <img 
        src={imageSrc} 
        alt={alt} 
        className={styles.avatarPreviewImage}
        onError={(e) => {
          (e.target as HTMLImageElement).src = "https://via.placeholder.com/280x350?text=AI+Avatar";
        }}
      />
    </div>
  );
}
