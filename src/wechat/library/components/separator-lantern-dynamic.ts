import type { BuiltInComponentDef } from '../componentRegistryTypes'

const component = {
  // 建议文件名: separator-lantern-dynamic.ts
  id: 'separator-lantern-dynamic',
  name: '分割线-动态灯笼',
  desc: '带有轻微摇摆动画的中国风灯笼分割线（红金配色）。',
  category: '分割线',

  // 我们使用内嵌 SVG 来实现矢量图形和动画。
  // section 是一个比 div 更语义化的容器，微信支持良好。
  html: `
<section style="text-align: center; margin: 3em 0; line-height: 0;">
  <svg width="320" height="80" viewBox="0 0 320 80" xmlns="http://www.w3.org/2000/svg" style="max-width: 100%; height: auto; overflow: visible;">
    <defs>
      <g id="lantern-grp">
        <line x1="0" y1="0" x2="0" y2="12" stroke="#d4af37" stroke-width="1.5"/>
        <ellipse cx="0" cy="28" rx="14" ry="16" fill="#c02c38" stroke="#d4af37" stroke-width="1"/>
        <line x1="-10" y1="18" x2="10" y2="18" stroke="#d4af37" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="-10" y1="38" x2="10" y2="38" stroke="#d4af37" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="0" y1="44" x2="0" y2="60" stroke="#c02c38" stroke-width="3" stroke-linecap="round"/>
        <circle cx="0" cy="60" r="1.5" fill="#d4af37"/>
      </g>

      <style type="text/css">
        /* 定义摇摆动画关键帧 */
        @keyframes lanternSwing {
          0% { transform: rotate(-4deg); }
          100% { transform: rotate(4deg); }
        }
        
        /* 应用动画的类 */
        .swinging-lantern {
          /* 动画解析：
            - 3s ease-in-out: 3秒完成一次，缓入缓出，更自然。
            - infinite alternate: 无限循环，来回交替播放。
          */
          animation: lanternSwing 3s ease-in-out infinite alternate;
          /* 关键：设置旋转原点为顶部 (x=0, y=0)，这样才会像挂着一样摇摆 */
          transform-origin: 0 0; 
        }
        
        /* 为不同的灯笼设置稍微不同的动画时长，避免同步摇摆太死板 */
        .delay-1 { animation-duration: 2.8s; }
        .delay-2 { animation-duration: 3.2s; }
      </style>
    </defs>
    
    <line x1="10" y1="5" x2="310" y2="5" stroke="#d4af37" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.7" stroke-linecap="round"/>

    <g transform="translate(80, 5)" class="swinging-lantern delay-1">
      <use href="#lantern-grp"/>
    </g>
    
    <g transform="translate(160, 8)" class="swinging-lantern">
      <g transform="scale(1.05)">
         <use href="#lantern-grp"/>
      </g>
    </g>

    <g transform="translate(240, 5)" class="swinging-lantern delay-2">
      <use href="#lantern-grp"/>
    </g>
  </svg>
</section>
<p><br/></p>
`.trim(),
} satisfies BuiltInComponentDef

export default component