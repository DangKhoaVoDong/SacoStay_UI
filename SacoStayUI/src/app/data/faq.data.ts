export interface FaqDetailSection {
  title?: string;
  paragraphs?: string[];
  list?: string[];
}

export interface FaqItem {
  id: string;
  question: string;
  shortAnswer: string;
  detailPath: string;
  ctaLabel: string;
  answeredBy: string;
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  sections: FaqDetailSection[];
  relatedLinks?: { label: string; path: string }[];
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'pricing',
    question: 'SacoStay có mất phí không?',
    shortAnswer:
      'SacoStay áp dụng mô hình Freemium. Sinh viên có thể tìm kiếm phòng trọ và sử dụng các tính năng cơ bản hoàn toàn miễn phí. Một số tính năng nâng cao sẽ được cung cấp trong gói Premium nếu người dùng có nhu cầu.',
    detailPath: '/pricing',
    ctaLabel: 'Xem chi tiết các gói dịch vụ',
    answeredBy: 'Đội ngũ SacoStay',
    heroBadge: 'Pricing & Membership',
    heroTitle: 'SacoStay có mất phí không?',
    heroSubtitle: 'Tìm hiểu mô hình Freemium và các gói Premium dành cho sinh viên.',
    sections: [
      {
        paragraphs: [
          'SacoStay áp dụng mô hình Freemium — bạn có thể bắt đầu miễn phí với các tính năng cốt lõi dành cho sinh viên.',
          'Việc tìm phòng trọ, xem tin đăng và trải nghiệm matching roommate cơ bản không yêu cầu trả phí ngay từ đầu.'
        ]
      },
      {
        title: 'Miễn phí bao gồm',
        list: [
          'Tìm kiếm và xem tin phòng trọ trên nền tảng',
          'Sử dụng các tính năng cơ bản của hệ thống',
          'Trải nghiệm ghép roommate theo hạn mức miễn phí'
        ]
      },
      {
        title: 'Gói Premium',
        paragraphs: [
          'Khi bạn cần thêm lượt swipe, ưu tiên hiển thị hoặc trải nghiệm nâng cao hơn, SacoStay cung cấp gói Premium với chi phí minh bạch.',
          'Bạn chỉ nâng cấp khi thực sự có nhu cầu — không bắt buộc thanh toán để bắt đầu sử dụng nền tảng.'
        ]
      }
    ],
    relatedLinks: [{ label: 'Xem bảng giá người thuê', path: '/tenant-pricing' }]
  },
  {
    id: 'roommate-matching',
    question: 'Làm sao để tìm roommate phù hợp?',
    shortAnswer:
      'SacoStay sẽ gợi ý những roommate phù hợp dựa trên sở thích, thói quen sinh hoạt và nhu cầu của bạn. Bạn có thể xem hồ sơ và trò chuyện trước khi đưa ra quyết định.',
    detailPath: '/roommate-matching',
    ctaLabel: 'Tìm hiểu cách hoạt động của Roommate Matching',
    answeredBy: 'Hệ thống Roommate Matching của SacoStay',
    heroBadge: 'Roommate Matching Guide',
    heroTitle: 'Làm sao để tìm roommate phù hợp?',
    heroSubtitle: 'Hướng dẫn quy trình matching trên SacoStay — từ trắc nghiệm đến kết nối.',
    sections: [
      {
        paragraphs: [
          'SacoStay gợi ý roommate dựa trên trắc nghiệm lối sống, nhu cầu ở ghép và thông tin hồ sơ bạn cung cấp.',
          'Hệ thống tính % hòa hợp để bạn dễ so sánh trước khi quyết định thích hay bỏ qua.'
        ]
      },
      {
        title: 'Quy trình gợi ý',
        list: [
          'Hoàn thành trắc nghiệm lối sống (giờ giấc, vệ sinh, thói quen…)',
          'Xem thẻ gợi ý với % phù hợp và thông tin công khai trên hồ sơ',
          'Thích người bạn cảm thấy phù hợp hoặc bỏ qua nếu chưa hợp',
          'Trò chuyện qua tin nhắn trước khi gặp mặt hoặc ở chung'
        ]
      },
      {
        paragraphs: [
          'Bạn chủ động lựa chọn — SacoStay chỉ gợi ý, không tự động ghép mà không có sự đồng ý của bạn.'
        ]
      }
    ],
    relatedLinks: [
      { label: 'Bắt đầu tìm bạn ở ghép', path: '/discovery' },
      { label: 'Làm trắc nghiệm lối sống', path: '/lifestyle-quiz' }
    ]
  },
  {
    id: 'verified-listings',
    question: 'Tin đăng trên SacoStay có được xác minh không?',
    shortAnswer:
      'Những tin đăng có huy hiệu "Verified" đã được đội ngũ SacoStay kiểm tra và xác minh theo quy trình của nền tảng nhằm hạn chế rủi ro cho người dùng.',
    detailPath: '/verified-listings',
    ctaLabel: 'Tìm hiểu quy trình xác minh',
    answeredBy: 'Đội ngũ kiểm duyệt của SacoStay',
    heroBadge: 'Verified Listings',
    heroTitle: 'Tin đăng có được xác minh không?',
    heroSubtitle: 'Quy trình kiểm duyệt tin đăng và xác minh chủ trọ trên SacoStay.',
    sections: [
      {
        paragraphs: [
          'SacoStay kiểm duyệt tin đăng trước khi hiển thị công khai nhằm hạn chế thông tin sai lệch hoặc nội dung không phù hợp.',
          'Tin có huy hiệu Verified cho biết tin đăng hoặc chủ trọ đã qua bước xác minh theo quy trình nội bộ.'
        ]
      },
      {
        title: 'Quy trình kiểm duyệt',
        list: [
          'Rà soát nội dung tin đăng (mô tả, hình ảnh, thông tin liên hệ)',
          'Xác minh thông tin chủ trọ khi áp dụng chương trình Verified',
          'Ẩn hoặc gỡ tin vi phạm theo quy định nền tảng'
        ]
      },
      {
        paragraphs: [
          'Người dùng vẫn nên tự xác minh thêm khi đi xem phòng — Verified giúp giảm rủi ro, không thay thế hoàn toàn việc kiểm tra thực tế.'
        ]
      }
    ],
    relatedLinks: [{ label: 'Tìm phòng trọ', path: '/rooms' }]
  },
  {
    id: 'contact-landlord',
    question: 'Làm thế nào để liên hệ với chủ trọ?',
    shortAnswer:
      'Sau khi lựa chọn phòng phù hợp, bạn có thể liên hệ với chủ trọ thông qua thông tin liên hệ được cung cấp trên nền tảng hoặc qua tính năng nhắn tin của SacoStay.',
    detailPath: '/help/contact-landlord',
    ctaLabel: 'Xem hướng dẫn liên hệ chủ trọ',
    answeredBy: 'Hệ thống SacoStay',
    heroBadge: 'Help Center',
    heroTitle: 'Làm thế nào để liên hệ với chủ trọ?',
    heroSubtitle: 'Các bước liên hệ an toàn sau khi bạn chọn được phòng phù hợp.',
    sections: [
      {
        title: 'Trên trang chi tiết phòng',
        list: [
          'Xem mô tả, giá, vị trí và hình ảnh phòng trước khi liên hệ',
          'Sử dụng nút nhắn tin hoặc thông tin liên hệ hiển thị trên tin đăng (nếu có)',
          'Chuẩn bị câu hỏi về giá, tiện ích, quy định ở chung trước khi hẹn xem phòng'
        ]
      },
      {
        title: 'Lưu ý an toàn',
        paragraphs: [
          'Ưu tiên trao đổi qua kênh trên nền tảng để có lịch sử tin nhắn.',
          'Không chuyển tiền đặt cọc khi chưa xem phòng và chưa xác minh thông tin chủ trọ.'
        ]
      }
    ],
    relatedLinks: [
      { label: 'Tìm phòng trọ', path: '/rooms' },
      { label: 'Mở tin nhắn', path: '/chat' }
    ]
  },
  {
    id: 'roommate-support',
    question: 'Nếu gặp vấn đề với roommate thì SacoStay có hỗ trợ không?',
    shortAnswer:
      'SacoStay không can thiệp trực tiếp vào các tranh chấp cá nhân giữa người ở ghép. Tuy nhiên, chúng tôi sẽ hỗ trợ tiếp nhận phản hồi, hướng dẫn xử lý tình huống và tư vấn các giải pháp phù hợp nhằm đảm bảo trải nghiệm tốt nhất cho người dùng.',
    detailPath: '/help/roommate-support',
    ctaLabel: 'Liên hệ Trung tâm hỗ trợ',
    answeredBy: 'Bộ phận Chăm sóc khách hàng của SacoStay',
    heroBadge: 'Help Center – Roommate Support',
    heroTitle: 'SacoStay có hỗ trợ khi gặp vấn đề với roommate?',
    heroSubtitle: 'Phạm vi hỗ trợ và cách liên hệ khi cần tư vấn.',
    sections: [
      {
        paragraphs: [
          'SacoStay là nền tảng kết nối — chúng tôi không tham gia trực tiếp vào hợp đồng thuê hoặc thỏa thuận ở chung giữa các bên.',
          'Khi phát sinh mâu thuẫn cá nhân, chúng tôi có thể hướng dẫn cách trao đổi, báo cáo hành vi vi phạm hoặc chặn người dùng trên nền tảng.'
        ]
      },
      {
        title: 'SacoStay có thể hỗ trợ',
        list: [
          'Tiếp nhận phản hồi và báo cáo vi phạm trên nền tảng',
          'Hướng dẫn quy trình xử lý tình huống phù hợp',
          'Tư vấn các bước an toàn khi ở ghép'
        ]
      },
      {
        title: 'Liên hệ hỗ trợ',
        paragraphs: [
          'Email: sacostay79@gmail.com',
          'Hotline: 0366723474',
          'Mọi phản hồi sẽ được tiếp nhận và xử lý trong thời gian sớm nhất theo quy trình của nền tảng.'
        ]
      }
    ],
    relatedLinks: [{ label: 'Điều khoản & Chính sách', path: '/terms' }]
  }
];

export const FAQ_BY_ID: Record<string, FaqItem> = Object.fromEntries(FAQ_ITEMS.map((item) => [item.id, item]));

export function faqItemById(id: string): FaqItem | undefined {
  return FAQ_BY_ID[id];
}
