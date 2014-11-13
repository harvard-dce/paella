# DCE git strategy to work with upstream paella

## Principles

* `dce-release` represents the branch we'll deploy and integrate, as a git
  submodule, in our copy of `paella-matterhorn` and `matterhorn` proper.

* `master` should only contain commits from the main upstream `paella`
repository, and be rebased constantly against upstream `paella.`

If you want to create a feature, create your feature branch off `master`, which
will give us the greatest likelihood of creating something that can be
contributed back to the core paella player.

If your feature is 100% DCE-specific, then it's OK to create the feature branch
off `dce-release` proper. This should be used with caution to maximize our
likelihood of creating code we can open source.

## The process

    # Set up our fork and the upstream origin, you only need to do this once
    git clone git@github.com:harvard-dce/paella.git
    git remote add upstream https://github.com/polimediaupv/paella

    # Change into our copy of master
    git co master

    # Update our master branch, which should be an exact copy of upstream/master
    # NOTE: This part of the process may change when paella 4.0 is released to
    # work from a specific tag instead of the upstream master - but for now,
    # we'll work from master.
    git fetch --all
    # You should NEVER have merge conflicts below.
    git rebase -i upstream/master
    # Push the latest commits from upstream master
    git push

    # Now we'll create a feature branch off master (which you should usually do)
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

    # If the pull request is rejected upstream, then we're going to put our
    # feature on top of dce-release
    git checkout your-feature-branch-name
    git rebase -i origin/dce-release
    # Ensure you're on your feature branch before force pushing
    git push -f
    # Code review happens, but it should be cursory as we've mostly reviewed already.

    # Fix any problems that occur. When we're ready:
    git checkout dce-release
    # WIP - probably a better way to do this
    git cherry-pick <sha of commits in your feature branch>
    # The dce-release git log should look like upstream/master with a bunch
    # of DCE specific commits on top.
    git push

    # Clean up after yourself by removing the now merged feature branch commits.
    git push origin :your-feature-branch-name
    git branch -d your-feature-branch-name

