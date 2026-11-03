import type { ThemeSettings } from "../../../modules/websites/types/site-content.types.js";
import type { TemplateFooter, TemplateHeader, TemplatePage } from "../../../modules/websites/types/template.types.js";
import type { ThemeSeed } from "../themes.js";
import type { WebsiteTemplateSeed } from "../templates.js";

/** Theme paired with the Pannjha e-commerce template. */
export const PANNJHA_SAREE_THEME: ThemeSeed = {
  name: "Pannjha Heritage",
  settings: {
  "fonts": {
    "body": "manrope",
    "heading": "eb-garamond"
  },
  "colors": {
    "text": "#2B2118",
    "muted": "#6E5F52",
    "primary": "#A63D10",
    "surface": "#F3E6DA",
    "secondary": "#2B2118",
    "background": "#FBF7F2"
  },
  "radius": "sm",
  "cardStyle": "border",
  "buttonStyle": "filled",
  "containerWidth": 1200,
  "sectionSpacing": "normal"
} as ThemeSettings,
};

const header = {
  "cta": {
    "href": "/login",
    "label": "Login"
  },
  "logo": {
    "alt": "",
    "url": "https://webcmsb.hrtrace.com/api/media/files/7d0029ee-f73c-4f49-95a0-44c1f97ef664"
  },
  "design": "logo-left",
  "sticky": true,
  "settings": {
    "background": "default",
    "hideOnMobile": false
  },
  "logoHeight": 74,
  "secondaryCta": {
    "href": "/shop",
    "label": "Shop Now"
  }
} as TemplateHeader;

const footer = {
  "logo": {
    "alt": "",
    "url": "https://webcmsb.hrtrace.com/api/media/files/fff9c4f0-f032-4b1f-87c2-aebcc3ec779a"
  },
  "menu": [
    {
      "href": "/",
      "label": "Home"
    },
    {
      "href": "/about",
      "label": "About"
    },
    {
      "href": "/contact",
      "label": "Contact"
    },
    {
      "href": "/categories",
      "label": "Categories"
    }
  ],
  "design": "columns",
  "social": [],
  "columns": [
    {
      "links": [
        {
          "href": "/",
          "label": "Home"
        },
        {
          "href": "/shop",
          "label": "Categories"
        },
        {
          "href": "/about",
          "label": "About"
        },
        {
          "href": "/contact",
          "label": "Contact"
        }
      ],
      "title": "Pages"
    },
    {
      "links": [
        {
          "href": "/refund-policy",
          "label": "Refund Policy"
        },
        {
          "href": "/privacy-policy",
          "label": "Privacy Policy"
        },
        {
          "href": "/shipping-policy",
          "label": "Shipping Policy"
        },
        {
          "href": "/terms-of-service",
          "label": "Terms of Service"
        }
      ],
      "title": "<strong>Policies</strong>"
    },
    {
      "links": [
        {
          "href": "/",
          "label": "designspaanjha@gmail.com"
        },
        {
          "href": "/",
          "label": "7708921342"
        }
      ],
      "title": "Contact us"
    }
  ],
  "tagline": "Threads of elegance woven with love",
  "settings": {
    "background": "default",
    "hideOnMobile": false
  },
  "legalLinks": [],
  "logoHeight": 106,
  "newsletter": {
    "title": "Sign up for our newsletter <br>",
    "enabled": true
  },
  "paymentMethods": {
    "enabled": true,
    "methods": []
  }
} as TemplateFooter;

const pages = [
  {
    "name": "Home",
    "slug": "/",
    "pageType": "HOME",
    "showInNav": true,
    "sections": [
      {
        "data": {
          "heading": "Where Elegance Meets Tradition",
          "variant": "campaign-banner",
          "videoUrl": "https://webcmsb.hrtrace.com/api/media/files/ba33e528-b23f-427f-820f-0984c91f6833",
          "minHeight": "auto",
          "primaryCta": {
            "href": "/shop",
            "label": "Get started"
          },
          "subheading": "Discover the grace of handcrafted sarees, woven with love and artistry.",
          "bottomShape": "curve",
          "contentAlign": "left",
          "bgOverlayType": "gradient",
          "campaignStats": [
            {
              "icon": "users",
              "label": "Active Members",
              "value": "12,450"
            },
            {
              "icon": "pin",
              "label": "Milestones Hit",
              "value": "320+"
            }
          ],
          "overlayOpacity": 25,
          "bannerCurveDepth": 80,
          "campaignProgress": {
            "currency": "$",
            "percentage": 95,
            "raisedLabel": "funded",
            "targetLabel": "of $300,000 milestone",
            "raisedAmount": "285,000",
            "targetAmount": "300,000"
          },
          "bannerBottomShape": "curved",
          "backgroundVideoUrl": "https://webcmsb.hrtrace.com/api/media/files/ba33e528-b23f-427f-820f-0984c91f6833",
          "bottomDividerColor": "var(--wb-bg, #ffffff)"
        },
        "type": "hero",
        "hidden": false,
        "settings": {
          "background": "default",
          "hideOnMobile": false
        }
      },
      {
        "data": {
          "intro": "Tailored services engineered to accelerate growth, enhance performance, and elevate your presence.",
          "items": [
            {
              "link": {
                "href": "/shop",
                "label": "Shop Now"
              },
              "image": {
                "alt": "Linen Sarees",
                "url": "https://webcmsb.hrtrace.com/api/media/files/04eb0876-21d4-4b29-aa15-bc9923eb5264"
              },
              "title": "Linen Sarees",
              "description": "Lightweight and breathable, perfect for warm weather."
            },
            {
              "link": {
                "href": "/shop",
                "label": "Shop Now"
              },
              "image": {
                "alt": "Kota Sarees",
                "url": "https://webcmsb.hrtrace.com/api/media/files/a98c9917-ffb9-463a-8c7d-e49da2802588"
              },
              "title": "Kota Sarees",
              "description": "Delicate and elegant, ideal for special occasions."
            },
            {
              "link": {
                "href": "/shop",
                "label": "Shop Now"
              },
              "image": {
                "alt": "Banarasi Sarees",
                "url": "https://webcmsb.hrtrace.com/api/media/files/f6309e27-e708-40da-920c-f663d0f6f68f"
              },
              "title": "Banarasi Sarees",
              "description": "Richly woven with intricate designs, a true masterpiece."
            },
            {
              "link": {
                "href": "/shop",
                "label": "Shop Now"
              },
              "image": {
                "alt": "Festive Collections",
                "url": "https://webcmsb.hrtrace.com/api/media/files/19f6aec4-9050-4869-8d58-7a61277df5ee"
              },
              "title": "Festive Collections",
              "description": "Celebrate with our exclusive festive sarees."
            }
          ],
          "columns": 3,
          "eyebrow": "Explore Our Beautiful Collections",
          "heading": "Shop by Collection",
          "variant": "cards-grid",
          "bottomCta": {
            "href": "/shop",
            "label": "Explore all capabilities"
          },
          "cardStyle": "surface",
          "iconStyle": "pastel-circle",
          "showIcons": true,
          "showBadges": true,
          "showPrices": true,
          "showBullets": true,
          "mobileColumns": 1
        },
        "type": "services",
        "hidden": false,
        "settings": {
          "background": "default",
          "hideOnMobile": false
        }
      },
      {
        "data": {
          "text": "Premium materials and\nhand-selected finishing touches",
          "button": {
            "href": "/shop",
            "label": "Shop Now"
          },
          "eyebrow": "Join the Experience",
          "heading": "<strong>Step into a World of Elegance</strong>",
          "variant": "centered-card",
          "trustBadges": []
        },
        "type": "cta",
        "hidden": false,
        "settings": {
          "align": "center",
          "spacing": "default",
          "background": "surface",
          "hideOnMobile": false
        }
      },
      {
        "data": {
          "intro": "Each saree reflects our commitment to quality and elegance.",
          "items": [
            {
              "label": "Handcrafted Styles",
              "value": "100+"
            },
            {
              "label": "Unique Collections",
              "value": "6"
            },
            {
              "label": "Happy Customers",
              "value": "5,000+"
            },
            {
              "label": "Years of Tradition",
              "value": "20+"
            }
          ],
          "heading": "Crafted with Care"
        },
        "type": "stats",
        "hidden": false,
        "settings": {
          "align": "center",
          "spacing": "default",
          "background": "default",
          "hideOnMobile": false
        }
      },
      {
        "data": {
          "image": {
            "alt": "",
            "url": "https://webcmsb.hrtrace.com/api/media/files/6f20dcb4-bdbc-4947-92ee-605f4265ca10"
          },
          "eyebrow": "Welcome to Pannjha",
          "heading": "New Arrivals",
          "variant": "centered",
          "mediaType": "image",
          "primaryCta": {
            "href": "/shop",
            "label": "Shop now"
          },
          "subheading": "Introducing Our Latest Products, made especially for the season. Shop your favourites before they're gone !",
          "highlightText": "Elegance Meets Tradition",
          "imagePosition": "background"
        },
        "type": "hero",
        "hidden": false,
        "settings": {
          "align": "center",
          "spacing": "default",
          "background": "default",
          "hideOnMobile": false
        }
      }
    ]
  },
  {
    "name": "About",
    "slug": "/about",
    "pageType": "ABOUT",
    "showInNav": true,
    "sections": [
      {
        "data": {
          "body": "At Pannjha, we weave together the rich heritage of Indian textiles with modern elegance. Founded by John, our brand is a tribute to the artistry of handwoven sarees, each piece telling a story of craftsmanship and tradition.\n\nOur journey began with a love for the intricate techniques passed down through generations. We believe that every saree holds the spirit of the weaver, embracing the grace of the wearer. With every collection, we aim to celebrate the timeless beauty of these garments while making them accessible for the modern woman.\n\nWe collaborate closely with skilled artisans, ensuring that each saree not only meets the highest standards of quality but also supports the livelihoods of those who create them. Our commitment to sustainability and ethical practices reflects our respect for both the craft and the community.\n\nJoin us as we celebrate the elegance of handwoven textiles, where each drape is a canvas of art and heritage.",
          "heading": "Our Story"
        },
        "type": "text",
        "hidden": false,
        "settings": {
          "align": "center",
          "spacing": "default",
          "background": "default",
          "hideOnMobile": false
        }
      },
      {
        "data": {
          "intro": "We stand by our core principles that guide everything we do at Pannjha.",
          "items": [
            {
              "icon": "check",
              "title": "Handcrafted Excellence",
              "iconColor": "purple",
              "description": "Every saree is meticulously crafted by skilled artisans, ensuring that no two pieces are alike."
            },
            {
              "icon": "heart",
              "title": "Sustainable Practices",
              "iconColor": "purple",
              "description": "We prioritize eco-friendly methods, sourcing materials that are kind to both the planet and the community."
            },
            {
              "icon": "users",
              "title": "Empowering Artisans",
              "iconColor": "purple",
              "description": "By working directly with local weavers, we support traditional craftsmanship and empower skilled artisans."
            }
          ],
          "columns": 3,
          "eyebrow": "Our Values",
          "heading": "Craftsmanship, Tradition, and Elegance",
          "variant": "grid",
          "mobileColumns": 1
        },
        "type": "features",
        "hidden": false,
        "settings": {
          "align": "center",
          "spacing": "default",
          "background": "surface",
          "hideOnMobile": false
        }
      },
      {
        "data": {
          "intro": "Our dedicated team is passionate about preserving the art of handwoven sarees and delivering elegance to every woman.",
          "columns": 3,
          "eyebrow": "",
          "heading": "Crafting Dreams into Reality",
          "members": [],
          "variant": "grid-cards",
          "mobileColumns": 1
        },
        "type": "team",
        "hidden": false,
        "settings": {
          "align": "center",
          "spacing": "default",
          "background": "default",
          "hideOnMobile": false
        }
      }
    ]
  },
  {
    "name": "Contact",
    "slug": "/contact",
    "pageType": "CONTACT",
    "showInNav": true,
    "sections": [
      {
        "data": {
          "text": "At Pannjha, we value every thread of connection with our cherished customers. Whether you have a question about our handcrafted sarees, need assistance with your order, or simply want to share your experience, we're here for you. Reach out to us through any of the channels below, or fill out the form and we’ll get back to you promptly.",
          "eyebrow": "Get in Touch",
          "heading": "We'd Love to Hear from You",
          "variant": "split-form",
          "showForm": true,
          "formHeading": "Contact Us",
          "officeHours": "Monday to Saturday: 10 AM - 6 PM",
          "submitLabel": "Send Message",
          "responseTime": "We strive to respond within 24 hours.",
          "serviceOptions": [
            "Order Inquiries",
            "Product Information",
            "Feedback & Suggestions"
          ]
        },
        "type": "contact",
        "hidden": false,
        "settings": {
          "align": "center",
          "spacing": "default",
          "background": "default",
          "hideOnMobile": false
        }
      },
      {
        "data": {
          "body": "Every saree tells a story woven with care and love. At Pannjha, we believe in the beauty of connection, and we invite you to reach out with your thoughts, questions, or simply to share your journey with our elegant sarees. Your experience is precious to us, and we’re dedicated to ensuring your satisfaction with our handcrafted creations.\n\nThank you for choosing Pannjha, where tradition meets elegance.",
          "heading": "Your Connection Matters"
        },
        "type": "text",
        "hidden": false,
        "settings": {
          "align": "center",
          "spacing": "default",
          "background": "surface",
          "hideOnMobile": false
        }
      }
    ]
  },
  {
    "name": "Shop",
    "slug": "/shop",
    "pageType": "CUSTOM",
    "showInNav": true,
    "sections": [
      {
        "data": {
          "title": "Our products",
          "design": "showcase",
          "layout": "grid-3",
          "eyebrow": "Catalogue",
          "showSort": true,
          "subtitle": "Search by name or filter by category.",
          "detailBase": "/Product",
          "showSearch": true,
          "emptyMessage": "No products yet.",
          "showCategoryFilter": true
        },
        "type": "products",
        "hidden": false,
        "settings": {
          "background": "surface",
          "hideOnMobile": false
        }
      }
    ]
  },
  {
    "name": "Product",
    "slug": "/product",
    "pageType": "CUSTOM",
    "showInNav": false,
    "sections": [
      {
        "data": {
          "design": "split",
          "backHref": "/shop",
          "backLabel": "All products",
          "showStock": true,
          "showDescription": true,
          "showCancellationPolicy": true
        },
        "type": "product_detail",
        "hidden": false,
        "settings": {
          "background": "default",
          "hideOnMobile": false
        }
      }
    ]
  },
  {
    "name": "Login",
    "slug": "/login",
    "pageType": "CUSTOM",
    "showInNav": false,
    "sections": [
      {
        "data": {
          "otp": {
            "length": 6,
            "enabled": true,
            "heading": "Verify it's you",
            "subheading": "Enter the verification code we just sent to your email.",
            "resendLabel": "Resend code",
            "submitLabel": "Verify code",
            "resendSeconds": 45,
            "requireOnLogin": false,
            "requireOnForgot": false,
            "requireOnRegister": true
          },
          "login": {
            "fields": [
              {
                "name": "email",
                "type": "email",
                "label": "Email",
                "width": "full",
                "required": true,
                "placeholder": "Enter your email address"
              },
              {
                "name": "password",
                "type": "password",
                "label": "Password",
                "width": "full",
                "required": true,
                "placeholder": "Enter your password"
              }
            ],
            "heading": "Welcome back",
            "subheading": "Sign in to your account to continue shopping.",
            "forgotLabel": "Forgot password?",
            "submitLabel": "Log in",
            "switchLabel": "Sign up",
            "showRemember": true,
            "switchPrompt": "Don't have an account?",
            "rememberLabel": "Remember me"
          },
          "panel": {
            "text": "Create an account in seconds and start building your first onboarding experience.",
            "heading": "New here?",
            "highlights": [
              "No credit card required",
              "Unlimited flows on the free plan",
              "Cancel anytime"
            ],
            "registerText": "Log in to your account so you can continue building and editing your onboarding flows.",
            "registerHeading": "Already signed up?"
          },
          "forgot": {
            "fields": [
              {
                "name": "email",
                "type": "email",
                "label": "Email",
                "width": "full",
                "required": true,
                "placeholder": "Enter your email address"
              }
            ],
            "enabled": true,
            "heading": "Reset your password",
            "backLabel": "Back to log in",
            "subheading": "Enter the email linked to your account and we'll send you a reset link.",
            "submitLabel": "Send reset link",
            "successText": "If an account exists for that email, a reset link is on its way.",
            "successHeading": "Check your inbox"
          },
          "social": {
            "label": "Or continue with",
            "style": "icons",
            "enabled": false,
            "position": "bottom",
            "providers": []
          },
          "variant": "diagonal-split",
          "register": {
            "fields": [
              {
                "name": "fullName",
                "type": "text",
                "label": "Full name",
                "width": "full",
                "required": true,
                "placeholder": "Your name"
              },
              {
                "name": "email",
                "type": "email",
                "label": "Email",
                "width": "full",
                "required": true,
                "placeholder": "Enter your email address"
              },
              {
                "name": "password",
                "type": "password",
                "label": "Password",
                "width": "full",
                "required": true,
                "placeholder": "Enter your password"
              }
            ],
            "enabled": true,
            "heading": "Create an account",
            "showTerms": false,
            "subheading": "Save your details so you can purchase from this shop.",
            "submitLabel": "Sign up",
            "switchLabel": "Log in",
            "switchPrompt": "Already have an account?"
          },
          "animation": "fade",
          "brandName": "",
          "minHeight": "screen",
          "footerNote": "Protected by industry-standard encryption.",
          "inputStyle": "outline",
          "showLabels": true,
          "buttonShape": "rounded",
          "defaultView": "login",
          "headingSize": "md",
          "successLink": {
            "href": "/account",
            "label": "Continue to account"
          },
          "successText": "Your account is ready.",
          "formPosition": "right",
          "showFieldIcons": false,
          "successHeading": "You're signed in",
          "backgroundMotion": true,
          "showPasswordToggle": true
        },
        "type": "auth",
        "hidden": false,
        "settings": {
          "background": "default",
          "hideOnMobile": false
        }
      }
    ]
  },
  {
    "name": "Account",
    "slug": "/account",
    "pageType": "CUSTOM",
    "showInNav": false,
    "sections": [
      {
        "data": {
          "heading": "My account",
          "preview": "member",
          "variant": "sidebar-tabs",
          "shopHref": "/shop",
          "showCart": true,
          "cartLabel": "Cart",
          "guestText": "Your orders, cart and profile details are only shown to signed-in customers.",
          "loginHref": "/login",
          "saveLabel": "Save changes",
          "showOrders": true,
          "subheading": "Your orders, cart and profile at John's company.",
          "logoutLabel": "Log out",
          "ordersLabel": "Orders",
          "showProfile": true,
          "guestHeading": "Sign in to see your account",
          "profileLabel": "Profile",
          "showPassword": true,
          "emptyCartText": "Your cart is empty.",
          "passwordLabel": "Password",
          "emptyOrdersText": "You haven't placed any orders yet.",
          "guestButtonLabel": "Log in",
          "redirectWhenLoggedOut": false
        },
        "type": "account",
        "hidden": false,
        "settings": {
          "background": "default",
          "hideOnMobile": false
        }
      }
    ]
  },
  {
    "name": "Refund Policy",
    "slug": "/refund-policy",
    "pageType": "CUSTOM",
    "showInNav": false,
    "sections": [
      {
        "data": {
          "body": "Every piece at<strong> Paanjha Boutique</strong> is checked before it's packed. If something isn't right, we're here to help. \n\n<strong>Returns:</strong> You can request a return or exchange within 7 days of delivery if the item is damaged, defective, wrong, or doesn't fit. Items must be unused, unwashed and have all original tags.\n\n<strong>Not returnable</strong>: Customised or stitched items, sale items, accessories, and items damaged after use or washing. \n\n<strong>Handloom note:</strong> Small variations in weave and colour are natural in handmade fabric and are not defects.\n\n<strong>How to return:</strong> WhatsApp or email us within 7 days with your order number, photos and an unboxing video. We'll reply within 48 hours.\n\n<strong>Refunds:</strong> Approved refunds are processed within 5–7 working days to your original payment method, or to your bank/UPI for COD orders. Shipping charges are non-refundable unless the item was damaged or wrong.\n\n<strong>Cancellations:</strong> Orders can be cancelled before dispatch for a full refund.\n\n<strong>Contact: designspaanjha@gmail.com · +91 [7708921342]</strong>",
          "heading": "Refund Policy"
        },
        "type": "text",
        "hidden": false,
        "settings": {
          "background": "default",
          "hideOnMobile": false
        }
      }
    ]
  },
  {
    "name": "Privacy Policy",
    "slug": "/privacy-policy",
    "pageType": "CUSTOM",
    "showInNav": false,
    "sections": [
      {
        "data": {
          "body": "Paanjha Boutique respects your privacy. This policy explains how we use your information.\n\n<strong>What we collect:</strong> Your name, phone, email, address and order details. Payments are handled securely by our payment partner. We never store your card or UPI details.\n\n<strong>How we use it: </strong>To process and deliver your orders, send order updates, handle returns and, only if you agree, share new arrivals and offers.\n\n<strong>Sharing: </strong>We share only what's needed with courier and payment partners. We never sell your data.\n\n<strong>Cookies:</strong> We use cookies to keep your cart and improve the website.\n\n<strong>Your rights:</strong> You can ask us to view, update or delete your data, or stop marketing messages, anytime.\n\n<strong>Grievance Officer: Paanjha · Contact: designspaanjha@gmail.com · +91 [7708921342]</strong>",
          "heading": "Privacy Policy"
        },
        "type": "text",
        "hidden": false,
        "settings": {
          "background": "default",
          "hideOnMobile": false
        }
      }
    ]
  },
  {
    "name": "Shipping Policy",
    "slug": "/shipping-policy",
    "pageType": "CUSTOM",
    "showInNav": false,
    "sections": [
      {
        "data": {
          "body": "We ship across India. For international orders, please contact us.\n\n<strong>Processing:</strong> Ready-to-ship orders are dispatched within 1–3 working days. Custom or stitched orders take [7–15] working days.\n\n<strong>Delivery:</strong> Usually 3–7 working days after dispatch, depending on your location.\n\n<strong>Charges</strong>: Free shipping on orders above ₹[1,999]. A flat ₹[99] applies below that. Cash on delivery has an extra ₹[49] fee.\n\n<strong>Tracking</strong>: You'll receive a tracking link by SMS, WhatsApp or email once your order ships.\n\n<strong>Damaged parcels:</strong> Please don't accept a parcel that looks opened or damaged. If already accepted, share an unboxing video with us within 48 hours.\n\n<strong>Contact: designspaanjha@gmail.com · +91 [7708921342]</strong>",
          "heading": "Shipping Policy"
        },
        "type": "text",
        "hidden": false,
        "settings": {
          "background": "default",
          "hideOnMobile": false
        }
      }
    ]
  },
  {
    "name": "Terms of Service",
    "slug": "/terms-of-service",
    "pageType": "CUSTOM",
    "showInNav": false,
    "sections": [
      {
        "data": {
          "body": "By using this website or placing an order, you agree to these terms.\n\n<strong>Products:</strong> We describe our sarees, kurtis and party wear as accurately as possible. Colours may vary slightly due to lighting and screens, and handloom pieces may have natural variations.\n\n<strong>Prices:</strong> All prices are in Indian Rupees and include GST. Prices and offers may change without notice.\n\n<strong>Orders: </strong>Your order is confirmed once you receive a confirmation message. We may cancel orders if an item is out of stock or payment fails, with a full refund.\n\n<strong>Content</strong>: All photos, designs and text on this website belong to Paanjha Boutique and can't be used without permission.\n\n<strong>Governing law: These terms follow Indian law.</strong>\n\n<strong>Contact: designspaanjha@gmail.com · +91 [7708921342]</strong>",
          "heading": "Terms of Service"
        },
        "type": "text",
        "hidden": false,
        "settings": {
          "background": "default",
          "hideOnMobile": false
        }
      }
    ]
  }
] as TemplatePage[];

/**
 * Built-in e-commerce template promoted from the Super Admin "Pannjha" save.
 * Image/video URLs use the production media CDN so gallery previews match live.
 */
export const PANNJHA_SAREE: WebsiteTemplateSeed = {
  key: "pannjha-saree",
  name: "Pannjha",
  category: "E-commerce",
  description: "Handcrafted saree boutique with shop, product detail, account, and policy pages.",
  themeName: PANNJHA_SAREE_THEME.name,
  header,
  footer,
  pages,
};
