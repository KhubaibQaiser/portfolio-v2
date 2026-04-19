export const PortfolioEvents = {
  primaryNavClick: "portfolio_primary_nav_click",
  commandPaletteOpened: "portfolio_command_palette_opened",
  commandPaletteAction: "portfolio_command_palette_action",
  outboundLink: "portfolio_outbound_link",
  resumeView: "portfolio_resume_view",
  resumePdfDownload: "portfolio_resume_pdf_download",
  projectViewed: "portfolio_project_viewed",
  blogPostViewed: "portfolio_blog_post_viewed",
  themeChanged: "portfolio_theme_changed",
  chatOpened: "portfolio_chat_opened",
  chatClosed: "portfolio_chat_closed",
  chatMessageSent: "portfolio_chat_message_sent",
  chatClientError: "portfolio_chat_client_error",
  chatApiRequest: "portfolio_chat_api_request",
  chatApiError: "portfolio_chat_api_error",
  contactSubmit: "portfolio_contact_submit",
  contactApiError: "portfolio_contact_api_error",
  githubApi: "portfolio_github_api",
  githubApiError: "portfolio_github_api_error",
} as const;

export type PortfolioEventName =
  (typeof PortfolioEvents)[keyof typeof PortfolioEvents];
