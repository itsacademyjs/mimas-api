module.exports = {
    audioConfig: {
        audioEncoding: "LINEAR16",
        pitch: -1.0,
        speakingRate: 0.8,
    },
    input: {
        text: `
Google Summer of Code (GSock) is a program organized by Google once a year, where selected students from all around the world participate and contribute to open-source projects for three months. The primary goal of this program is to introduce and encourage students to participate in open-source development. What’s more? GSock was founded by Larry Page and Sergey Brin themselves!
In this article, I’ll talk about my journey to GSock 2020, including how I shortlisted the organizations and wrote a clear proposal to improve my chances of getting selected. I hope this article helps anyone interested in applying to GSock. You can find my application here.
Choosing the Right Organization and Project
After Google Summer of Code is announced, like students, the mentoring open-source organizations submit their applications to Google. The administrators at Google review these applications and publish the list of accepted mentoring organizations. You can find the list of organizations here.
Your first step is to browse the list to find organizations you find interesting. You can filter by topic, technology (including programming languages used), and category.
Shortlist a few organizations. You’re still in the early stages of applying to GSock. Therefore, you don’t have to choose just one organization.
Once you find the organizations you’re interested in, start looking through their repositories on GitHub. Spend some time reading the code they’ve produced, and skim through their documentation.
Shortlist the projects you’re interested in. A project is basically an idea that the mentoring organization wants to be implemented. Each organization posts a list of suggested projects you can implement along with their respective mentors. However, you’re not limited to just these projects. You’re encouraged to suggest your own project ideas, too.
Personally, I was interested in projects that involved compiler design or cloud computing. I’m familiar with C, C++, Python, Java, and JavaScript. This was an advantage because most projects used one of these languages.
And for those projects for which I didn’t know the programming language or the technologies used, I was sure I could learn them quickly, either before or after my acceptance into GSock. I shortlisted LabLua, Ceph, Mypy, and OpenRefine.
After that, I browsed through their repositories on GitHub and enumerated the projects suggested by the organization. As I said, you can suggest your own projects, too. GitHub issues are a good place to look for problems that could become potential projects. In fact, my project was inspired by this GitHub issue.
Getting in Touch With the Community
After you shortlist the organizations and projects, you need to get in touch with the community. There are many ways you can contact the members of the community — some of them include IRC channels, Slack, Discord, GitHub, and email. Introduce yourself to the community. Let them know you’d like to participate in GSock and contribute to their organization.
Not everybody in the community participates in GSock. The members who participate and guide students are called mentors. You need to contact them as soon as possible. From what I’ve seen, most mentors are really friendly and helpful. In fact, some mentors have been student participants themselves previously.
You can ask them anything related to their organization. You can ask them for ideas, why a particular feature is important for the organization, the problems the existing users are facing, and even ask about your doubts when you’re stuck on a problem.
After talking to the mentors of all the projects, I shortlisted two organizations: Ceph and LabLua. I started learning compiler design when I was in the ninth grade, so I’m comfortable with enough concepts to get by. However, cloud computing was relatively new to me. I felt Ceph was a bit complicated for me, so I decided to move onto LabLua. Additionally, I found the mentors at LabLua really friendly and approachable (not that others were unfriendly).
LabLua is a laboratory at PUC-Rio, one of the best universities in Brazil, that does research on programming languages, with Lua at its center. LabLua was founded by Professor Roberto Ierusalimschy, the creator of the Lua programming language.
`,
    },
    voice: {
        languageCode: "en-US",
        name: "en-US-Wavenet-J",
        ssmlGender: "NEUTRAL",
    },
    outputFileName: "gsoc.mp3",
};
