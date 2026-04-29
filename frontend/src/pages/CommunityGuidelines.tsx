import { Layout } from '@/components/Layout'
import { SEO } from '@/components/SEO'

export function CommunityGuidelines() {
  return (
    <Layout>
      <SEO
        title="Community Guidelines | Worship Room"
        description="How we treat each other in the shared spaces of Worship Room — what's welcome, what we ask you not to share, how we handle crisis content, and how privacy works."
      />
      <div className="mx-auto max-w-3xl py-12 sm:py-16">
        <h1 className="text-3xl font-bold text-white sm:text-4xl">
          Worship Room Community Guidelines
        </h1>

        <h2 className="mt-10 text-xl font-semibold text-white">
          Welcome
        </h2>
        <p className="mt-3 text-white/80 leading-relaxed">
          Worship Room is a quiet place for prayer, scripture, journaling, and worship — built
          to feel like a sanctuary, not a feed. This document describes how we hope to treat
          each other in the spaces we share with other people. It&apos;s a summary, not a
          contract; the goal is to make the community feel safe enough that real prayer
          requests, real reflections, and real grief can show up here. If something here is
          unclear or feels off to you, please tell us (see &ldquo;If something goes
          wrong&rdquo; below) — we&apos;d rather get this right than be polished.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-white">
          The shared spaces
        </h2>
        <p className="mt-3 text-white/80 leading-relaxed">
          Most of Worship Room is private by default. A few corners are shared with other
          people, and we want to be clear about which is which.
        </p>
        <p className="mt-3 text-white/80 leading-relaxed">What exists today:</p>
        <ul className="mt-3 space-y-2 text-white/80 leading-relaxed">
          <li>
            <strong className="text-white">Prayer Wall</strong> — A community feed where you
            can post a prayer request, comment on someone else&apos;s, react with
            &ldquo;praying,&rdquo; or bookmark a request to come back to. Anyone visiting
            Worship Room can read prayer wall posts. You can choose to post anonymously.
          </li>
          <li>
            <strong className="text-white">Display name</strong> — Visible to friends you
            connect with on the app. We don&apos;t show real names by default.
          </li>
          <li>
            <strong className="text-white">Friends</strong> — A short list of people
            you&apos;ve added; small interactions like encouragements and gentle nudges
            happen here. Friends never see your mood data.
          </li>
        </ul>
        <p className="mt-3 text-white/80 leading-relaxed">What&apos;s coming as we grow:</p>
        <ul className="mt-3 space-y-2 text-white/80 leading-relaxed">
          <li>
            <strong className="text-white">Public profiles</strong> — A page showing your
            display name, public stats, and prayer requests you&apos;ve chosen to share
            publicly.
          </li>
          <li>
            <strong className="text-white">Threaded comments</strong> — Replies on Prayer
            Wall posts will be able to branch into conversations.
          </li>
          <li>
            <strong className="text-white">Block and mute</strong> — Tools for stepping back
            from a person without confrontation. Blocks are silent; the blocked person
            isn&apos;t notified.
          </li>
          <li>
            <strong className="text-white">Reporting</strong> — A way to tell us about
            content that breaks these guidelines.
          </li>
          <li>
            <strong className="text-white">Search and discovery</strong> — Surfaces that help
            you find prayer requests in the categories you care about.
          </li>
        </ul>
        <p className="mt-3 text-white/80 leading-relaxed">What stays private — always:</p>
        <ul className="mt-3 space-y-2 text-white/80 leading-relaxed">
          <li>Your journal entries</li>
          <li>Your conversations with the AI Bible chat</li>
          <li>Your mood check-ins</li>
          <li>
            Your highlights, notes, bookmarks, and memorization deck in the Bible reader
          </li>
          <li>
            Your personal prayer list (the requests you save for yourself, separate from
            public Prayer Wall posts)
          </li>
        </ul>
        <p className="mt-3 text-white/80 leading-relaxed">
          None of those surface to friends, to the community, or to leaderboards. That&apos;s
          a structural choice, not a setting you have to find.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-white">
          What you&apos;re welcome to share
        </h2>
        <p className="mt-3 text-white/80 leading-relaxed">
          The Prayer Wall and the rest of the shared spaces exist because you bring them to
          life. Anything that fits the spirit of those spaces is welcome here:
        </p>
        <ul className="mt-3 space-y-2 text-white/80 leading-relaxed">
          <li>Prayer requests for yourself, for someone you love, or for a situation you&apos;re carrying</li>
          <li>Testimonies of answered prayer</li>
          <li>Reflections on scripture or on your faith</li>
          <li>Encouragement for another user who is going through something hard</li>
          <li>Honest questions — about doubt, about grief, about whether God hears you</li>
          <li>Praise that you want witnessed</li>
          <li>Requests for prayer about ordinary days, not only dramatic ones</li>
        </ul>
        <p className="mt-3 text-white/80 leading-relaxed">
          You don&apos;t have to be eloquent. You don&apos;t have to have it figured out.
          Short, plain prayer requests are as welcome as long, careful ones.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-white">
          What we ask you not to share
        </h2>
        <p className="mt-3 text-white/80 leading-relaxed">
          This list is intentionally specific — we&apos;d rather be clear than vague. Each
          item has a short reason so you can see what we&apos;re protecting.
        </p>
        <ul className="mt-3 space-y-2 text-white/80 leading-relaxed">
          <li>
            <strong className="text-white">Content that demeans, harasses, or threatens another person</strong>{' '}
            — including other users, public figures, and groups. The whole point of a shared
            prayer space is that people feel safe being vulnerable here; harassment breaks
            that.
          </li>
          <li>
            <strong className="text-white">Spam, advertising, or repeated identical posts.</strong>{' '}
            This is a community, not a distribution channel.
          </li>
          <li>
            <strong className="text-white">Personal information about other people without their consent</strong>{' '}
            — full names, phone numbers, addresses, workplaces, photos. You can pray for
            &ldquo;my sister&rdquo; without naming her.
          </li>
          <li>
            <strong className="text-white">Sexually explicit material.</strong> This
            isn&apos;t the place for it.
          </li>
          <li>
            <strong className="text-white">Detailed descriptions of methods of self-harm or suicide.</strong>{' '}
            The Crisis section below explains the reason for this rule, and it&apos;s not
            squeamishness.
          </li>
          <li>
            <strong className="text-white">Content that promotes hatred toward any group based on race, ethnicity, national origin, gender identity, sexual orientation, religion, or disability.</strong>{' '}
            Worship Room serves Christians from many traditions and people walking in from
            outside the faith. Hate makes the room unsafe for the people we exist to serve.
          </li>
          <li>
            <strong className="text-white">Aggressive proselytizing of specific users.</strong>{' '}
            Sharing your own faith, your own story, your own scripture — welcome. Pressuring
            a particular person who didn&apos;t ask, especially in the comments on a prayer
            request they posted, is a different thing.
          </li>
          <li>
            <strong className="text-white">Doctrinal arguments aimed at &ldquo;winning.&rdquo;</strong>{' '}
            People come from different traditions. We&apos;re a prayer space, not a debate
            forum.
          </li>
          <li>
            <strong className="text-white">Impersonation.</strong> Don&apos;t claim to be
            someone you&apos;re not.
          </li>
          <li>
            <strong className="text-white">Anything illegal under U.S. federal law.</strong>
          </li>
        </ul>

        <h2 className="mt-10 text-xl font-semibold text-white">
          Crisis content
        </h2>
        <p className="mt-3 text-white/80 leading-relaxed">
          This is the section we ask you to read carefully, because the small choices we make
          here affect people in real distress.
        </p>

        <h3 className="mt-6 text-lg font-semibold text-white">
          If you&apos;re in crisis right now
        </h3>
        <p className="mt-3 text-white/80 leading-relaxed">
          Worship Room provides spiritual encouragement and support. It is not a substitute
          for professional medical, psychological, or psychiatric care. Our AI features are
          not a substitute either. If you&apos;re in crisis, please reach out to people who
          are trained to help:
        </p>
        <ul className="mt-3 space-y-2 text-white/80 leading-relaxed">
          <li>
            <strong className="text-white">988 Suicide &amp; Crisis Lifeline</strong> — call
            or text{' '}
            <a
              href="tel:988"
              className="text-primary-lt underline hover:text-primary transition-colors"
            >
              988
            </a>
          </li>
          <li>
            <strong className="text-white">Crisis Text Line</strong> — text HOME to{' '}
            <a
              href="sms:741741?&body=HOME"
              className="text-primary-lt underline hover:text-primary transition-colors"
            >
              741741
            </a>
          </li>
          <li>
            <strong className="text-white">SAMHSA National Helpline</strong> —{' '}
            <a
              href="tel:1-800-662-4357"
              className="text-primary-lt underline hover:text-primary transition-colors"
            >
              1-800-662-4357
            </a>
          </li>
          <li>
            <strong className="text-white">In immediate danger</strong> — call{' '}
            <a
              href="tel:911"
              className="text-primary-lt underline hover:text-primary transition-colors"
            >
              911
            </a>{' '}
            or your local emergency number
          </li>
        </ul>
        <p className="mt-3 text-white/80 leading-relaxed">
          We hope you&apos;ll reach out. None of these numbers are a sign of weakness or
          failure; they&apos;re staffed by people who chose this work because they wanted to
          be there at the hardest moments.
        </p>

        <h3 className="mt-6 text-lg font-semibold text-white">
          If you encounter content from another user that suggests they may be in crisis
        </h3>
        <p className="mt-3 text-white/80 leading-relaxed">
          Stay present in your prayer for them. If something they wrote scares you,
          that&apos;s information — take it seriously, but stay calm. We&apos;re adding a way
          for you to flag posts for community support; until that ships, what you can do is:
        </p>
        <ul className="mt-3 space-y-2 text-white/80 leading-relaxed">
          <li>Pray, including specifically for their safety</li>
          <li>
            If someone is in immediate danger and you have any way to reach local emergency
            services for them, do that — your call may matter more than your comment
          </li>
          <li>
            If it feels right, reach out gently in the comments; don&apos;t pressure,
            don&apos;t lecture, don&apos;t quote scripture in a tone that might land as
            judgment
          </li>
        </ul>
        <p className="mt-3 text-white/80 leading-relaxed">What we ask you not to do:</p>
        <ul className="mt-3 space-y-2 text-white/80 leading-relaxed">
          <li>Don&apos;t shame them for posting</li>
          <li>Don&apos;t give unsolicited medical or psychiatric advice</li>
          <li>
            Don&apos;t share their content elsewhere — screenshots, social posts, group
            chats. A vulnerable moment doesn&apos;t belong on someone else&apos;s timeline.
          </li>
          <li>Don&apos;t speculate publicly about their situation</li>
        </ul>

        <h3 className="mt-6 text-lg font-semibold text-white">
          Why we don&apos;t allow detailed descriptions of self-harm or suicide methods
        </h3>
        <p className="mt-3 text-white/80 leading-relaxed">
          This is a hard rule, even when shared with what feels like helpful intent —
          including phrases like &ldquo;I had this thought, and let me tell you exactly
          how.&rdquo;
        </p>
        <p className="mt-3 text-white/80 leading-relaxed">
          The reason is contagion. Research on media reporting of suicide consistently finds
          that exposure to specific methods raises risk for vulnerable readers, and a prayer
          wall is read, by design, by people in vulnerable moments. We can&apos;t keep people
          safe and host that content at the same time.
        </p>
        <p className="mt-3 text-white/80 leading-relaxed">
          Your feeling is real, and you are welcome to share that you&apos;re struggling,
          that you&apos;ve had dark thoughts, or that you&apos;re scared. The specifics about
          how stay out of the post.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-white">
          How privacy works on Worship Room
        </h2>
        <p className="mt-3 text-white/80 leading-relaxed">
          Most of what you do on Worship Room is private to you and stays in your browser.
          Your journal, your AI Bible chats, your mood check-ins, your Bible highlights and
          notes and memorization cards — none of that is visible to anyone else, today or as
          we grow. The Prayer Wall and your friends list are the deliberate exceptions: those
          exist to be shared, and we&apos;re explicit about which interactions are public,
          which are friends-only, and which are private.
        </p>
        <p className="mt-3 text-white/80 leading-relaxed">
          Mood data is private by design. Friends never see your mood; we don&apos;t aggregate
          it for leaderboards; we don&apos;t surface it in any social feature.
        </p>
        <p className="mt-3 text-white/80 leading-relaxed">
          For the legal-precise version of who-sees-what and how data flows, see the Privacy
          Policy at content/privacy-policy.md.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-white">
          If something goes wrong
        </h2>
        <p className="mt-3 text-white/80 leading-relaxed">
          If you see content that breaks these guidelines, or if someone is treating you in a
          way you&apos;d like us to know about, we want to hear from you.
        </p>
        <p className="mt-3 text-white/80 leading-relaxed">
          We&apos;re building a reporting flow into the app — you&apos;ll be able to flag a
          post or a user without leaving the page, and the report will go to our moderation
          queue. Until that ships, please reach out by email at{' '}
          <a
            href="mailto:support@worshiproom.com"
            className="text-primary-lt underline hover:text-primary transition-colors"
          >
            support@worshiproom.com
          </a>
          .
        </p>
        <p className="mt-3 text-white/80 leading-relaxed">
          A few things to set expectations:
        </p>
        <ul className="mt-3 space-y-2 text-white/80 leading-relaxed">
          <li>
            We&apos;re a small team. Reports get read; they don&apos;t always get a response
            within an hour.
          </li>
          <li>Crisis content and harassment move to the front of the line.</li>
          <li>
            We won&apos;t share your identity with the person you reported. Reports are
            confidential.
          </li>
          <li>
            We make decisions one at a time, with care. A single report doesn&apos;t
            auto-delete a post; a human reviews.
          </li>
        </ul>
        <p className="mt-3 text-white/80 leading-relaxed">
          For account-level concerns — deleting your account, exporting your data, questions
          about a moderation action that affected you — same email:{' '}
          <a
            href="mailto:support@worshiproom.com"
            className="text-primary-lt underline hover:text-primary transition-colors"
          >
            support@worshiproom.com
          </a>
          . We&apos;ll add self-serve flows for these as we build out the tools, and
          we&apos;ll point to them from this section when they ship.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-white">
          How these guidelines change
        </h2>
        <p className="mt-3 text-white/80 leading-relaxed">
          We may revise these guidelines as Worship Room grows, especially as new features
          like forums, threaded comments, and the public profile page come online. When we
          make material changes, we&apos;ll note them inside the app and update the version
          below.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-white">
          Last updated and version
        </h2>
        <ul className="mt-3 space-y-2 text-white/80 leading-relaxed">
          <li>
            <strong className="text-white">Last updated:</strong> April 25, 2026
          </li>
          <li>
            <strong className="text-white">Version:</strong> 1.0
          </li>
          <li>
            <strong className="text-white">Related documents:</strong>
            <ul className="mt-2 space-y-1 pl-6">
              <li>Privacy Policy: content/privacy-policy.md</li>
              <li>Terms of Service: content/terms-of-service.md</li>
            </ul>
          </li>
        </ul>
      </div>
    </Layout>
  )
}
