import type { ImgHTMLAttributes, ReactElement } from 'react'

/**
 * Google (and some other) avatar URLs reject requests with a foreign Referer.
 * `referrerPolicy="no-referrer"` keeps images loading in the browser from our SPA origin.
 */
type AvatarImgProps = Pick<
  ImgHTMLAttributes<HTMLImageElement>,
  'src' | 'alt' | 'className' | 'width' | 'height' | 'loading' | 'decoding'
>

export function AvatarImg({
  src,
  alt = '',
  className,
  width,
  height,
  loading,
  decoding = 'async',
}: AvatarImgProps): ReactElement {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading={loading}
      decoding={decoding}
      referrerPolicy="no-referrer"
    />
  )
}
