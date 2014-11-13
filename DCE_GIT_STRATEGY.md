# DCE git trategy to work with upstream paella

## Principles

* `dce-release` represents the branch we'll deploy and integrate with our copy of
`paella-matterhorn` and matterhorn proper.

* `master` should only contain commits from the main upstream `paella`
repository, and be rebased constantly against upstream `paella.`

If you want to create a feature, create your feature branch off `master`, which
will give us the greatest likelihood of creating something that can be
contributed back to the core paella player.

If your feature is 100% DCE-specific, then I suppose it's OK to create the
feature branch off `dce-release` proper. This should be used with caution to
maximize our likelihood of creating code we can open source.

## The process

    # Set up our fork and the upstream origin
    git clone git@github.com:harvard-dce/paella.git
    git remote add upstream https://github.com/polimediaupv/paella

    # Change into our copy of master
    git co master

    # Update our master branch, which should be an exact copy of upstream/master
    git fetch --all
    git rebase -i upstream/master # You should NEVER have merge conflicts
    git push # Push the latest commits from upstream master

    # Now we'll create a feature branch
    # Start from master (which you should usually do)
    git checkout master

    # Or start from dce-release (generally discouraged, see above)
    git checkout dce-release

    git checkout -b your-feature-branch-name
    git push -u origin your-feature-branch-name

    # Stuff happens, now you're ready to merge after a code review
    # Squash to the minimum number of commits necessary.
    git rebase -i origin/master
    # Ensure you're on your feature branch before force pushing
    git push -f

    # A pull request is created against upstream/master if we've got a generic feature.
    # If the pull request is accepted, then just rebase dce-release against
    # our master after upstream master is updated.

    # If the pull request is rejected upstream, then we're going to rebase our feature onto dce-release
    git checkout your-feature-branch-name
    git rebase -i origin/dce-release
    git push -f # Ensure you're on your feature branch before force pushing
    # Code review happens, but it should be cursory as we've mostly reviewed already.

    # Fix any problems that occur. When we're ready:
    git checkout dce-release
    git cherry-pick <sha of commits in your feature branch> # WIP - probably a better way to do this
    git push

    # Clean up after yourself by removing the now merged feature branch commits.
    git push origin :your-feature-branch-name
    git branch -d your-feature-branch-name

